import { cn } from "@/lib/utils";

export function SummaryStatusTitle({ status }: { status: "confirmed" | "cancelled" | "updated" }) {
  const isCancelled = status === "cancelled";
  const isUpdated = status === "updated";

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          isCancelled
            ? "bg-[#fff1f2] text-[#be123c]"
            : isUpdated
              ? "bg-[rgba(26,115,232,0.12)] text-[var(--primary-container)]"
              : "bg-[rgba(0,191,165,0.14)] text-[var(--accent-strong)]",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isCancelled ? (
            <>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </>
          ) : isUpdated ? (
            <>
              <path d="M20 11a8 8 0 0 0-14.8-4.2L4 9" />
              <path d="M4 4v5h5" />
              <path d="M4 13a8 8 0 0 0 14.8 4.2L20 15" />
              <path d="M20 20v-5h-5" />
            </>
          ) : (
            <path d="M20 7 9 18l-5-5" />
          )}
        </svg>
      </span>
      <span>
        Booking summary - {isCancelled ? "Cancelled" : isUpdated ? "Updated" : "Confirmed"}
      </span>
    </span>
  );
}
