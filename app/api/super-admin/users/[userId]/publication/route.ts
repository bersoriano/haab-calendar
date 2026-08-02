import { NextResponse, type NextRequest } from "next/server";

import {
  setUserPublicationEnabled,
  SuperAdminAccessError,
} from "@/lib/supabase/publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PublicationBody = {
  publishingEnabled?: unknown;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  let body: PublicationBody;

  try {
    body = (await request.json()) as PublicationBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid publication request." },
      { status: 400 },
    );
  }

  if (typeof body.publishingEnabled !== "boolean") {
    return NextResponse.json(
      { userMessage: "Publication status must be true or false." },
      { status: 400 },
    );
  }

  try {
    const result = await setUserPublicationEnabled(
      userId,
      body.publishingEnabled,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SuperAdminAccessError) {
      return NextResponse.json({ userMessage: "Not found." }, { status: 404 });
    }

    if (error instanceof Error && error.message === "User not found.") {
      return NextResponse.json({ userMessage: error.message }, { status: 404 });
    }

    console.error("super_admin_publication_update_failed", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { userMessage: "Could not update publication." },
      { status: 500 },
    );
  }
}
