import type { ModuleStore } from "@/lib/types";

/** The parts of the store the "Save changes" PUT writes. */
function persistedShape(store: ModuleStore) {
  return {
    provider: store.provider,
    availability: store.availability,
    services: store.services,
    vertical: store.vertical,
  };
}

/**
 * Whether the owner has edits the server has not seen. Bookings and holds are
 * excluded: they change from the server's side and through their own
 * endpoints, never through the settings save.
 */
export function isStoreDirty(saved: ModuleStore, current: ModuleStore): boolean {
  return JSON.stringify(persistedShape(saved)) !== JSON.stringify(persistedShape(current));
}
