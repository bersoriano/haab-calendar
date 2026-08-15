import { NextResponse, type NextRequest } from "next/server";

import {
  clearProviderFeatureOverride,
  FeatureOverrideInputError,
  setProviderFeatureOverride,
} from "@/lib/entitlements/server";
import { SuperAdminAccessError } from "@/lib/supabase/publication";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OverrideParams = { providerId: string; featureKey: string };

type SetBody = {
  enabled?: unknown;
  expiresAt?: unknown;
  reason?: unknown;
};

type ClearBody = {
  reason?: unknown;
};

/**
 * Super-admin access failures answer 404, matching the sibling routes: an
 * unauthorised caller learns nothing about which providers exist.
 */
function toErrorResponse(error: unknown, context: OverrideParams & { op: string }) {
  if (error instanceof SuperAdminAccessError) {
    return NextResponse.json({ userMessage: "Not found." }, { status: 404 });
  }

  if (error instanceof FeatureOverrideInputError) {
    return NextResponse.json({ userMessage: error.userMessage }, { status: error.status });
  }

  console.error("super_admin_feature_override_failed", {
    op: context.op,
    providerId: context.providerId,
    featureKey: context.featureKey,
    error: error instanceof Error ? error.message : String(error),
  });

  return NextResponse.json(
    { userMessage: "Could not update the feature override." },
    { status: 500 },
  );
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<OverrideParams> },
) {
  const { providerId, featureKey } = await context.params;
  let body: SetBody;

  try {
    body = (await request.json()) as SetBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid feature override request." },
      { status: 400 },
    );
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { userMessage: "An override must be a grant or a revoke." },
      { status: 400 },
    );
  }

  try {
    const entitlements = await setProviderFeatureOverride({
      providerId,
      featureKey,
      enabled: body.enabled,
      expiresAt: (body.expiresAt ?? null) as string | null,
      reason: typeof body.reason === "string" ? body.reason : "",
    });

    return NextResponse.json(entitlements);
  } catch (error) {
    return toErrorResponse(error, { providerId, featureKey, op: "set" });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<OverrideParams> },
) {
  const { providerId, featureKey } = await context.params;
  let body: ClearBody;

  try {
    body = (await request.json()) as ClearBody;
  } catch {
    return NextResponse.json(
      { userMessage: "Invalid feature override request." },
      { status: 400 },
    );
  }

  try {
    const entitlements = await clearProviderFeatureOverride({
      providerId,
      featureKey,
      reason: typeof body.reason === "string" ? body.reason : "",
    });

    return NextResponse.json(entitlements);
  } catch (error) {
    return toErrorResponse(error, { providerId, featureKey, op: "clear" });
  }
}
