import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => {
  class MockAccountDeletionError extends Error {
    constructor(
      public readonly code:
        | "not_found"
        | "confirmation_mismatch"
        | "protected_account"
        | "deletion_failed"
        | "cleanup_persistence_failed",
      message: string,
    ) {
      super(message);
      this.name = "AccountDeletionError";
    }
  }

  class MockSuperAdminAccessError extends Error {}

  return {
    AccountDeletionError: MockAccountDeletionError,
    SuperAdminAccessError: MockSuperAdminAccessError,
    deleteManagedAccount: vi.fn(),
    retryAccountDeletionCleanup: vi.fn(),
  };
});

vi.mock("@/lib/supabase/account-deletion", () => ({
  AccountDeletionError: routeMocks.AccountDeletionError,
  deleteManagedAccount: routeMocks.deleteManagedAccount,
  retryAccountDeletionCleanup: routeMocks.retryAccountDeletionCleanup,
}));

vi.mock("@/lib/supabase/publication", () => ({
  SuperAdminAccessError: routeMocks.SuperAdminAccessError,
}));

import { DELETE } from "@/app/api/super-admin/users/[userId]/route";
import { POST } from "@/app/api/super-admin/account-deletion-cleanups/[jobId]/retry/route";

function deletionRequest(body: string) {
  return new Request("http://localhost/api/super-admin/users/target-user", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("super-admin account deletion routes", () => {
  beforeEach(() => {
    routeMocks.deleteManagedAccount.mockReset();
    routeMocks.retryAccountDeletionCleanup.mockReset();
  });

  it("rejects malformed deletion JSON", async () => {
    const response = await DELETE(deletionRequest("{"), {
      params: Promise.resolve({ userId: "target-user" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Invalid account deletion request.",
    });
    expect(routeMocks.deleteManagedAccount).not.toHaveBeenCalled();
  });

  it("requires a non-empty confirmation email", async () => {
    const response = await DELETE(
      deletionRequest(JSON.stringify({ confirmationEmail: "   " })),
      { params: Promise.resolve({ userId: "target-user" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Confirmation email is required.",
    });
  });

  it("returns completed deletion with status 200", async () => {
    routeMocks.deleteManagedAccount.mockResolvedValue({
      userId: "target-user",
      cleanupPending: false,
    });

    const response = await DELETE(
      deletionRequest(
        JSON.stringify({ confirmationEmail: "target@example.com" }),
      ),
      { params: Promise.resolve({ userId: "target-user" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      userId: "target-user",
      cleanupPending: false,
    });
    expect(routeMocks.deleteManagedAccount).toHaveBeenCalledWith(
      "target-user",
      "target@example.com",
    );
  });

  it("returns accepted when account is gone but cleanup remains", async () => {
    routeMocks.deleteManagedAccount.mockResolvedValue({
      userId: "target-user",
      cleanupPending: true,
    });

    const response = await DELETE(
      deletionRequest(
        JSON.stringify({ confirmationEmail: "target@example.com" }),
      ),
      { params: Promise.resolve({ userId: "target-user" }) },
    );

    expect(response.status).toBe(202);
  });

  it.each([
    ["confirmation_mismatch", 400, "Confirmation email does not match target account."],
    ["not_found", 404, "User not found."],
    ["protected_account", 409, "Sole super-admin account cannot be deleted."],
  ] as const)("maps %s deletion errors", async (code, status, userMessage) => {
    routeMocks.deleteManagedAccount.mockRejectedValue(
      new routeMocks.AccountDeletionError(code, userMessage),
    );

    const response = await DELETE(
      deletionRequest(
        JSON.stringify({ confirmationEmail: "target@example.com" }),
      ),
      { params: Promise.resolve({ userId: "target-user" }) },
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ userMessage });
  });

  it("conceals unauthorized deletion as not found", async () => {
    routeMocks.deleteManagedAccount.mockRejectedValue(
      new routeMocks.SuperAdminAccessError("Not found."),
    );

    const response = await DELETE(
      deletionRequest(
        JSON.stringify({ confirmationEmail: "target@example.com" }),
      ),
      { params: Promise.resolve({ userId: "target-user" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ userMessage: "Not found." });
  });

  it("hides internal deletion errors", async () => {
    routeMocks.deleteManagedAccount.mockRejectedValue(
      new routeMocks.AccountDeletionError(
        "deletion_failed",
        "Sensitive Supabase failure",
      ),
    );

    const response = await DELETE(
      deletionRequest(
        JSON.stringify({ confirmationEmail: "target@example.com" }),
      ),
      { params: Promise.resolve({ userId: "target-user" }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Could not delete account.",
    });
  });

  it("retries pending cleanup", async () => {
    routeMocks.retryAccountDeletionCleanup.mockResolvedValue({
      jobId: "cleanup-job",
      cleanupPending: false,
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "cleanup-job" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jobId: "cleanup-job",
      cleanupPending: false,
    });
  });

  it("maps missing cleanup job to 404", async () => {
    routeMocks.retryAccountDeletionCleanup.mockRejectedValue(
      new routeMocks.AccountDeletionError("not_found", "Cleanup job not found."),
    );

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "missing-job" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Cleanup job not found.",
    });
  });

  it("hides internal cleanup errors", async () => {
    routeMocks.retryAccountDeletionCleanup.mockRejectedValue(
      new Error("Sensitive Blob failure"),
    );

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ jobId: "cleanup-job" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      userMessage: "Could not clean up account assets.",
    });
  });
});
