import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_HEADER_IMAGE_BYTES,
  MAX_LOGO_IMAGE_BYTES,
} from "@/lib/image-upload";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Client-upload token route for public provider branding images.
// Client-upload keeps the header's 5 MB cap clear of Vercel's 4.5 MB server-body limit.
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { userMessage: "Sign in before uploading provider images." },
      { status: 401 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { userMessage: "Image storage is not configured." },
      { status: 503 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid upload request." },
      { status: 400 },
    );
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (clientPayload !== "header" && clientPayload !== "logo") {
          throw new Error("Choose a supported provider image type.");
        }

        return {
          allowedContentTypes: [...ACCEPTED_IMAGE_TYPES],
          maximumSizeInBytes:
            clientPayload === "logo"
              ? MAX_LOGO_IMAGE_BYTES
              : MAX_HEADER_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        userMessage:
          error instanceof Error ? error.message : "Image upload failed.",
      },
      { status: 400 },
    );
  }
}
