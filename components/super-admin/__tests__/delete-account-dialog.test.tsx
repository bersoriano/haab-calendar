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
        open
        user={ordinaryUser}
        busy={false}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(html).toMatch(/^<dialog/);
    expect(html).toMatch(/<h2[^>]*>(<span[^>]*>)?Delete target@example.com permanently\?/);
    expect(html).toContain("This cannot be undone.");
    expect(html).toContain("Login and authentication identity");
    expect(html).toContain("Bookings and client details");
    expect(html).toContain("Public URLs and current Haab-hosted branding images");
    expect(html).toContain("Type ");
    expect(html).toContain("target@example.com");
    expect(html).toContain("to confirm");
    expect(html).toContain("Delete permanently");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Delete permanently<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
    // One Cancel: the corner button closes, under its own name.
    expect(html).toContain('aria-label="Close"');
    expect(html).not.toContain('aria-label="Cancel"');
    // The typed confirmation is a labelled field, not a bare input.
    const inputId = html.match(/<input[^>]*id="([^"]+)"[^>]*type="email"|<input[^>]*type="email"[^>]*id="([^"]+)"/);
    expect(inputId).toBeTruthy();
    expect(html).toContain(`for="${inputId?.[1] ?? inputId?.[2]}"`);
  });

  it("describes the dialog with everything the deletion removes", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialog
        open
        user={{ ...ordinaryUser, demoOwner: true }}
        busy={false}
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    const describedBy = html.match(/^<dialog[^>]*aria-describedby="([^"]+)"/)?.[1];
    // The description sits in the dialog header, before its close button.
    const description = html.slice(html.indexOf(`id="${describedBy}"`), html.indexOf('aria-label="Close"'));

    // Focus lands on the typed confirmation, so the description is what a
    // screen reader announces about what is at stake.
    expect(description).toContain("This cannot be undone.");
    expect(description).toContain("Bookings and client details");
    expect(description).toContain("owns a public example page");
  });

  it("locks both actions while the deletion runs", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialog
        open
        user={ordinaryUser}
        busy
        error="Could not delete account."
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not delete account.");
  });

  it("warns when deleting a demo owner", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialog
        open
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
        open
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

  it("explains an empty queue on its own page", () => {
    expect(
      renderToStaticMarkup(<PendingDeletionCleanups initialJobs={[]} />),
    ).toContain("No cleanups waiting");
  });
});
