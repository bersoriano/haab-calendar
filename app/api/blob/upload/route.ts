import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_HEADER_IMAGE_BYTES,
} from "@/lib/image-upload";

export const dynamic = "force-dynamic";

// Client-upload token route for provider images (header now, gallery later).
// Client-upload keeps the 5 MB cap clear of Vercel's 4.5 MB server-body limit.
export async function POST(request: Request): Promise<NextResponse> {
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
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ACCEPTED_IMAGE_TYPES],
        maximumSizeInBytes: MAX_HEADER_IMAGE_BYTES,
        addRandomSuffix: true,
      }),
      // URL is returned to the client and stored on the provider record; no
      // server-side persistence needed here.
      onUploadCompleted: async () => {},
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
