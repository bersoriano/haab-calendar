import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { PendingDeletionCleanups } = await import("@/components/super-admin/PendingDeletionCleanups");

describe("PendingDeletionCleanups", () => {
  it("says there is nothing to clean up instead of rendering a blank page", () => {
    const html = renderToStaticMarkup(<PendingDeletionCleanups initialJobs={[]} />);

    expect(html).toContain("No cleanups waiting");
  });

  it("lists queued jobs with a retry", () => {
    const html = renderToStaticMarkup(
      <PendingDeletionCleanups
        initialJobs={[
          {
            id: "0f9a4c2e-0000-4000-8000-000000000001",
            attemptCount: 2,
            createdAt: "2026-10-01T10:00:00.000Z",
            updatedAt: "2026-10-02T10:00:00.000Z",
            lastAttemptFailed: true,
          },
        ]}
      />,
    );

    expect(html).toContain("Cleanup 0f9a4c2e");
    expect(html).toContain("2 failed attempts");
    expect(html).toContain("Retry cleanup");
  });

  it("marks a job whose last attempt failed with a status badge", () => {
    const job = {
      id: "0f9a4c2e-0000-4000-8000-000000000001",
      attemptCount: 1,
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    };
    const failed = renderToStaticMarkup(
      <PendingDeletionCleanups initialJobs={[{ ...job, lastAttemptFailed: true }]} />,
    );
    const queued = renderToStaticMarkup(
      <PendingDeletionCleanups initialJobs={[{ ...job, lastAttemptFailed: false }]} />,
    );

    expect(failed).toContain('role="list"');
    expect(failed).toMatch(/<span[^>]*ring-inset[^>]*>Last attempt failed<\/span>/);
    expect(queued).toMatch(/<span[^>]*ring-inset[^>]*>Queued<\/span>/);
    expect(queued).toContain("1 failed attempt ");
  });

  it("names the empty queue with a heading", () => {
    expect(renderToStaticMarkup(<PendingDeletionCleanups initialJobs={[]} />)).toMatch(
      /<h2[^>]*>No cleanups waiting<\/h2>/,
    );
  });
});
