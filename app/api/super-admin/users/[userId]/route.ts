import { NextResponse } from "next/server";

import {
  AccountDeletionError,
  deleteManagedAccount,
} from "@/lib/supabase/account-deletion";
import { SuperAdminAccessError } from "@/lib/supabase/publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DeletionBody = {
  confirmationEmail?: unknown;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  let body: DeletionBody;

  try {
    body = (await request.json()) as DeletionBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid account deletion request." },
      { status: 400 },
    );
  }

  if (
    typeof body.confirmationEmail !== "string" ||
    !body.confirmationEmail.trim()
  ) {
    return NextResponse.json(
      { userMessage: "Confirmation email is required." },
      { status: 400 },
    );
  }

  const { userId } = await context.params;

  try {
    const result = await deleteManagedAccount(
      userId,
      body.confirmationEmail,
    );
    return NextResponse.json(result, {
      status: result.cleanupPending ? 202 : 200,
    });
  } catch (error) {
    if (error instanceof SuperAdminAccessError) {
      return NextResponse.json({ userMessage: "Not found." }, { status: 404 });
    }

    if (error instanceof AccountDeletionError) {
      if (error.code === "confirmation_mismatch") {
        return NextResponse.json(
          { userMessage: error.message },
          { status: 400 },
        );
      }
      if (error.code === "not_found") {
        return NextResponse.json(
          { userMessage: error.message },
          { status: 404 },
        );
      }
      if (error.code === "protected_account") {
        return NextResponse.json(
          { userMessage: error.message },
          { status: 409 },
        );
      }
    }

    console.error("super_admin_account_deletion_failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { userMessage: "Could not delete account." },
      { status: 500 },
    );
  }
}
