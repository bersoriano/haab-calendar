import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeDailyBookingLimit } from "@/lib/availability";
import { getProviderDashboardStore } from "@/lib/supabase/bookings";
import {
  persistProviderStore,
  ProviderStoreWriteError,
  requireVertical,
  toServicePayload,
} from "@/lib/supabase/provider-store";
import { normalizeAvailability, normalizeServices, normalizeStore } from "@/lib/store";
import type { ModuleStore } from "@/lib/types";

/** The database function's refusals, in words the owner can act on. */
const REFUSALS: Record<string, { status: number; message: string }> = {
  upcoming_bookings: {
    status: 409,
    message:
      "You have upcoming bookings. Cancel or finish them before changing your business type.",
  },
  active_holds: {
    status: 409,
    message: "Someone is booking on your page right now. Try again in a few minutes.",
  },
  same_vertical: { status: 400, message: "Your page already uses this business type." },
  no_services: { status: 400, message: "Add at least one service before publishing." },
  not_found: { status: 404, message: "Finish setting up your booking page first." },
};

/**
 * Switches the caller's published page to the draft's business type.
 *
 * The swap itself — services, type, weekly hours, daily limit — happens in one
 * database transaction that re-checks for upcoming bookings and holds. Only
 * after it commits are the draft's kept profile and branding fields saved
 * through the ordinary store writer; if that second save fails, the switch has
 * still happened and the owner is told to review their profile.
 */
export async function switchProviderBusinessType(options: {
  supabase: SupabaseClient;
  ownerUserId: string;
  ownerEmail?: string;
  store: ModuleStore;
}): Promise<{ store: ModuleStore; profileWarning?: string }> {
  const store = normalizeStore(options.store);
  const vertical = requireVertical(store.vertical);
  const services = normalizeServices(store.services).map((service, index) => {
    // The function writes provider_id itself, from the caller's own row.
    const { provider_id: _providerId, ...row } = toServicePayload("", service, index);
    void _providerId;
    return row;
  });

  const { error } = await options.supabase.rpc("switch_provider_business_type", {
    p_vertical: vertical,
    p_availability: normalizeAvailability(store.availability),
    p_max_bookings_per_day: normalizeDailyBookingLimit(store.provider.maxBookingsPerDay),
    p_services: services,
  });

  if (error) {
    const refusal = REFUSALS[error.message];
    if (refusal) {
      throw new ProviderStoreWriteError(refusal.message, refusal.status);
    }

    throw new ProviderStoreWriteError("Could not change your business type.", 500, error);
  }

  try {
    const persisted = await persistProviderStore({
      supabase: options.supabase,
      ownerUserId: options.ownerUserId,
      ownerEmail: options.ownerEmail,
      store: { ...store, vertical, setupComplete: true },
    });
    return { store: persisted };
  } catch (cause) {
    console.error("business_type_profile_save_failed", {
      ownerUserId: options.ownerUserId,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    const reloaded = await getProviderDashboardStore(options.supabase, options.ownerUserId);

    if (!reloaded) {
      throw new ProviderStoreWriteError("Could not reload your booking page.", 500, cause);
    }

    return {
      store: reloaded,
      profileWarning:
        "Your business type changed, but some profile changes were not saved. Review them in Settings.",
    };
  }
}
