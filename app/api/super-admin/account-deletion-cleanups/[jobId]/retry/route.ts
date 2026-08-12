import { NextResponse } from "next/server";

import {
  AccountDeletionError,
  retryAccountDeletionCleanup,
} from "@/lib/supabase/account-deletion";
import { SuperAdminAccessError } from "@/lib/supabase/publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;

  try {
    const result = await retryAccountDeletionCleanup(jobId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SuperAdminAccessError) {
      return NextResponse.json({ userMessage: "Not found." }, { status: 404 });
    }

    if (error instanceof AccountDeletionError && error.code === "not_found") {
      return NextResponse.json(
        { userMessage: error.message },
        { status: 404 },
      );
    }

    console.error("super_admin_account_cleanup_retry_failed", {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { userMessage: "Could not clean up account assets." },
      { status: 500 },
    );
  }
}
