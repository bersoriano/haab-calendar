import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import {
  DeleteAccountDialog,
  isDeletionConfirmationMatch,
} from "@/components/super-admin/DeleteAccountDialog";
import { PendingDeletionCleanups } from "@/components/super-admin/PendingDeletionCleanups";
import type { ManagedUserSummary } from "@/lib/supabase/publication";

const ordinaryUser: ManagedUserSummary = {
  id: "ordinary-user",
  email: "target@example.com",
  createdAt: "2026-08-12T12:00:00.000Z",
  publishingEnabled: true,
  superAdmin: false,
  demoOwner: false,
};

describe("DeleteAccountDialog", () => {
  it("requires normalized exact-email confirmation", () => {
    expect(
      isDeletionConfirmationMatch(
        "target@example.com",
        " TARGET@EXAMPLE.COM ",
      ),
    ).toBe(true);
    expect(
      isDeletionConfirmationMatch(
        "target@example.com",
        "different@example.com",
      ),
    ).toBe(false);
  });

  it("renders irreversible scope and a disabled initial action", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialog
        user={ordinaryUser}
        busy={false}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Delete target@example.com permanently?");
    expect(html).toContain("Login and authentication identity");
    expect(html).toContain("Bookings and client details");
    expect(html).toContain("Public URLs and current Haab-hosted branding images");
    expect(html).toContain("Type ");
    expect(html).toContain("target@example.com");
    expect(html).toContain("to confirm");
    expect(html).toContain("Delete permanently");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Delete permanently<\/button>/);
  });

  it("warns when deleting a demo owner", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialog
        user={{
          ...ordinaryUser,
          email: "public-examples+doctors@haab-calendar.invalid",
          demoOwner: true,
        }}
        busy={false}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(html).toContain("This account owns a public example page");
    expect(html).toContain("return 404 until the demo is reseeded");
  });

  it("does not show demo consequences for an ordinary account", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialog
        user={ordinaryUser}
        busy={false}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(html).not.toContain("owns a public example page");
  });
});

describe("PendingDeletionCleanups", () => {
  it("renders opaque retry state without deleted-user data", () => {
    const html = renderToStaticMarkup(
      <PendingDeletionCleanups
        initialJobs={[
          {
            id: "8b131d6d-1044-4be8-a166-bd319c32b8ca",
            attemptCount: 2,
            lastAttemptFailed: true,
            createdAt: "2026-08-12T12:00:00.000Z",
            updatedAt: "2026-08-12T12:05:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Asset cleanup pending");
    expect(html).toContain("Cleanup 8b131d6d");
    expect(html).toContain("2 failed attempts");
    expect(html).toContain("Retry cleanup");
    expect(html).not.toContain("target@example.com");
    expect(html).not.toContain("blob.vercel-storage.com");
  });

  it("renders nothing when no cleanup is pending", () => {
    expect(
      renderToStaticMarkup(<PendingDeletionCleanups initialJobs={[]} />),
    ).toBe("");
  });
});
