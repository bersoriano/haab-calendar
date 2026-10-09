-- A rate-limit key that a script cannot reset by changing its user agent.
--
-- The visitor hash covers IP and user agent, so rotating the user agent made
-- every request look like a new visitor and walked past the per-visitor cap.
-- `network_hash` covers the IP alone — same secret, same day, same provider, so
-- it rotates daily and cannot link a network across days or pages — and the
-- ingest route caps events per network per hour as well.
--
-- Used only to limit writes. It is never returned by the summary.

alter table public.public_page_events
  add column if not exists network_hash text
    check (network_hash is null or network_hash ~ '^[0-9a-f]{64}$');

create index if not exists public_page_events_provider_network_occurred_idx
  on public.public_page_events(provider_id, network_hash, occurred_at desc);
