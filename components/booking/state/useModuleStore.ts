"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { backfillManageTokens } from "@/lib/booking-tokens";
import {
  normalizeAvailability,
  normalizeBookings,
  normalizeProvider,
  normalizeServices,
  normalizeStore,
  normalizeVertical,
  pruneBookingHolds,
  sortBookings,
  createEmptyStore,
  seedSetupLanguage,
} from "@/lib/store";
import type {
  BookingHoldRecord,
  BookingRecord,
  InjectedConfig,
  Lang,
  ModuleStore,
} from "@/lib/types";

export function useModuleStore(params: {
  injectedConfig?: Partial<InjectedConfig>;
  initialLanguage?: Lang;
  storageKey: string;
  onStoreChange?: (store: ModuleStore) => void;
  onBookingsChange?: (bookings: BookingRecord[]) => void;
}): {
  integratedMode: boolean;
  hydrated: boolean;
  store: ModuleStore;
  actions: {
    setStandaloneStore: Dispatch<SetStateAction<ModuleStore>>;
    updateStandaloneStore: (updater: (current: ModuleStore) => ModuleStore) => void;
    readStandaloneStoreSnapshot: () => ModuleStore | null;
    persistStandaloneStore: (nextStore: ModuleStore) => void;
    commitBookings: (
      nextBookings: BookingRecord[],
      standaloneBase?: ModuleStore,
      nextBookingHolds?: BookingHoldRecord[],
    ) => void;
    commitBookingHolds: (
      nextHolds: BookingHoldRecord[],
      standaloneBase?: ModuleStore,
    ) => void;
    releaseBookingHold: (holdId?: string) => void;
  };
} {
  const { injectedConfig, initialLanguage, storageKey, onStoreChange, onBookingsChange } = params;

  const integratedMode = Boolean(
    injectedConfig?.provider &&
      injectedConfig?.services?.length &&
      injectedConfig?.availability,
  );

  const [hydrated, setHydrated] = useState(integratedMode);
  const [standaloneStore, setStandaloneStore] = useState<ModuleStore>(() =>
    seedSetupLanguage(createEmptyStore(), initialLanguage),
  );
  const initialLanguageRef = useRef(initialLanguage);
  const [shadowBookings, setShadowBookings] = useState<BookingRecord[]>(() =>
    normalizeBookings(injectedConfig?.bookings),
  );
  const [shadowBookingHolds, setShadowBookingHolds] = useState<BookingHoldRecord[]>([]);
  const [shadowConfig, setShadowConfig] = useState<ModuleStore | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    if (integratedMode) {
      return;
    }

    const hydrationHandle = window.setTimeout(() => {
      const raw = window.localStorage.getItem(storageKey);

      if (raw) {
        try {
          const normalized = seedSetupLanguage(
            normalizeStore(JSON.parse(raw) as ModuleStore),
            initialLanguageRef.current,
          );
          const { changed, store: backfilled } = backfillManageTokens(normalized);
          if (changed) {
            window.localStorage.setItem(storageKey, JSON.stringify(backfilled));
          }
          setStandaloneStore(backfilled);
        } catch {
          setStandaloneStore(
            seedSetupLanguage(createEmptyStore(), initialLanguageRef.current),
          );
        }
      }

      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationHandle);
  }, [integratedMode, storageKey]);

  // Persist to localStorage
  useEffect(() => {
    if (!integratedMode && hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(standaloneStore));
    }
  }, [hydrated, integratedMode, standaloneStore, storageKey]);

  // Cross-tab storage event sync
  useEffect(() => {
    if (integratedMode) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== storageKey) {
        return;
      }

      if (!event.newValue) {
        return;
      }

      try {
        setStandaloneStore(normalizeStore(JSON.parse(event.newValue) as ModuleStore));
        setHydrated(true);
      } catch {
        // Ignore malformed external storage writes and keep the current in-memory store.
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, [integratedMode, storageKey]);

  const integratedBaseStore: ModuleStore = shadowConfig ?? {
    provider: normalizeProvider(injectedConfig?.provider),
    services: normalizeServices(injectedConfig?.services),
    availability: normalizeAvailability(injectedConfig?.availability),
    bookings: shadowBookings,
    bookingHolds: shadowBookingHolds,
    setupComplete: true,
    vertical: normalizeVertical(injectedConfig?.vertical),
  };

  const activeStore: ModuleStore = integratedMode
    ? {
        ...integratedBaseStore,
        bookings: shadowBookings,
        bookingHolds: shadowBookingHolds,
      }
    : standaloneStore;

  function emitStoreChange(next: ModuleStore) {
    onStoreChange?.(next);
  }

  function updateStandaloneStore(updater: (current: ModuleStore) => ModuleStore) {
    if (integratedMode) {
      const next = normalizeStore(updater(activeStore));
      setShadowConfig(next);
      setShadowBookings(next.bookings);
      setShadowBookingHolds(next.bookingHolds);
      emitStoreChange(next);
      return;
    }

    setStandaloneStore((current) => {
      const next = updater(current);
      emitStoreChange(next);
      return next;
    });
  }

  function readStandaloneStoreSnapshot() {
    if (integratedMode || typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return null;
    }

    try {
      return normalizeStore(JSON.parse(raw) as ModuleStore);
    } catch {
      return null;
    }
  }

  function persistStandaloneStore(nextStore: ModuleStore) {
    if (integratedMode || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextStore));
  }

  function commitBookingHolds(nextHolds: BookingHoldRecord[], standaloneBase?: ModuleStore) {
    const normalized = pruneBookingHolds(nextHolds);

    if (integratedMode) {
      setShadowBookingHolds(normalized);
      emitStoreChange({
        ...integratedBaseStore,
        bookings: shadowBookings,
        bookingHolds: normalized,
      });
      return;
    }

    const nextStore = {
      ...(standaloneBase ?? standaloneStore),
      bookingHolds: normalized,
    };

    setStandaloneStore(nextStore);
    persistStandaloneStore(nextStore);
    emitStoreChange(nextStore);
  }

  function releaseBookingHold(holdId?: string) {
    if (!holdId) {
      return;
    }

    const latestStandaloneStore = readStandaloneStoreSnapshot();
    const baseStore = latestStandaloneStore ?? activeStore;
    const nextHolds = baseStore.bookingHolds.filter((hold) => hold.id !== holdId);

    if (!integratedMode && latestStandaloneStore) {
      setStandaloneStore(latestStandaloneStore);
    }

    commitBookingHolds(nextHolds, baseStore);
  }

  function commitBookings(
    nextBookings: BookingRecord[],
    standaloneBase?: ModuleStore,
    nextBookingHolds?: BookingHoldRecord[],
  ) {
    const normalized = sortBookings(nextBookings);
    const normalizedHolds = pruneBookingHolds(
      nextBookingHolds ?? standaloneBase?.bookingHolds ?? activeStore.bookingHolds,
    );

    if (integratedMode) {
      setShadowBookings(normalized);
      setShadowBookingHolds(normalizedHolds);
      onBookingsChange?.(normalized);
      emitStoreChange({
        ...integratedBaseStore,
        bookings: normalized,
        bookingHolds: normalizedHolds,
      });
      return;
    }

    const nextStore = {
      ...(standaloneBase ?? standaloneStore),
      bookings: normalized,
      bookingHolds: normalizedHolds,
    };

    setStandaloneStore(nextStore);
    persistStandaloneStore(nextStore);
    emitStoreChange(nextStore);
  }

  return {
    integratedMode,
    hydrated,
    store: activeStore,
    actions: {
      setStandaloneStore,
      updateStandaloneStore,
      readStandaloneStoreSnapshot,
      persistStandaloneStore,
      commitBookings,
      commitBookingHolds,
      releaseBookingHold,
    },
  };
}
