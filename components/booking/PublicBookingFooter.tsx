import { normalizeBookingFooter } from "@/lib/booking-footer";

export function PublicBookingFooter({ text, url }: { text?: string; url?: string }) {
  const footer = normalizeBookingFooter({ publicFooterText: text, publicFooterUrl: url });
  return (
    <footer className="relative mt-auto px-4 py-6 text-center text-sm text-[var(--muted)] sm:px-6">
      <p className="break-words">
        {footer.text}{" "}
        <a href={footer.url} className="underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4">
          {footer.label}
        </a>
        {footer.developerCredit ? <> and developed by <a href="https://brilliant.dev" className="underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4">brilliant.dev</a></> : null}
      </p>
    </footer>
  );
}
