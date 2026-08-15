"use client";

import { useState } from "react";

import { FEATURE_KEYS, FEATURE_LABELS, type FeatureKey } from "@/lib/entitlements/catalog";
import {
  buildClearOverrideRequest,
  buildSetOverrideRequest,
  OverrideRequestError,
  type OverrideRequest,
} from "@/lib/entitlements/override-request";
import type { ProviderEntitlements } from "@/lib/entitlements/resolve";

function formatUtcDate(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

/**
 * Per-provider feature state, and the controls to change it.
 *
 * Everything shown here is resolved server-side and re-read after each write,
 * so the panel reports what the database decided rather than what the click
 * implied. A reason is mandatory in the form because it is mandatory in the
 * audit trail.
 */
export function ProviderFeatureOverrides({
  ownerEmail,
  entitlements,
}: {
  ownerEmail: string;
  entitlements: ProviderEntitlements;
}) {
  const [snapshot, setSnapshot] = useState(entitlements);
  const [editing, setEditing] = useState<FeatureKey>();
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  }>();

  function closeEditor() {
    setEditing(undefined);
    setReason("");
    setExpiresAt("");
  }

  async function send(request: OverrideRequest, successMessage: string) {
    setBusy(true);
    setFeedback(undefined);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const result = (await response.json()) as
        | (ProviderEntitlements & { userMessage?: string })
        | { userMessage?: string };

      if (!response.ok || !("features" in result)) {
        throw new Error(
          ("userMessage" in result && result.userMessage) ||
            "Could not update the feature override.",
        );
      }

      setSnapshot(result);
      setFeedback({ tone: "success", message: successMessage });
      closeEditor();
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not update the feature override.",
      });
    } finally {
      setBusy(false);
    }
  }

  function submit(featureKey: FeatureKey, action: "grant" | "revoke" | "clear") {
    try {
      const request =
        action === "clear"
          ? buildClearOverrideRequest({
              providerId: snapshot.providerId,
              featureKey,
              reason,
            })
          : buildSetOverrideRequest({
              providerId: snapshot.providerId,
              featureKey,
              enabled: action === "grant",
              expiresAt: expiresAt || undefined,
              reason,
            });

      const successMessage =
        action === "clear"
          ? "Override cleared. The plan decides this feature again."
          : action === "grant"
            ? "Feature granted."
            : "Feature withheld.";

      return send(request, successMessage);
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof OverrideRequestError
            ? error.message
            : "Could not update the feature override.",
      });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
        Plan: {snapshot.planTier}
      </p>
      <ul className="space-y-3">
        {FEATURE_KEYS.map((featureKey) => {
          const feature = snapshot.features[featureKey];
          const overridden = feature.source === "override";
          const open = editing === featureKey;

          return (
            <li key={featureKey} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[var(--ink)]">
                  {FEATURE_LABELS[featureKey]}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                    feature.enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {feature.enabled ? "On" : "Off"}
                </span>
                {overridden ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800">
                    Override
                  </span>
                ) : null}
              </div>
              {overridden && feature.overrideExpiresAt ? (
                <p className="text-xs text-[var(--muted)]">
                  Expires {formatUtcDate(feature.overrideExpiresAt)} UTC
                </p>
              ) : null}
              {open ? (
                <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <label className="block text-xs font-semibold text-[var(--ink)]">
                    Reason
                    <input
                      type="text"
                      value={reason}
                      maxLength={500}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={`Why ${ownerEmail} needs this change`}
                      className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm font-normal text-[var(--ink)]"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[var(--ink)]">
                    Expires (optional — blank means permanent)
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                      className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm font-normal text-[var(--ink)]"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submit(featureKey, "grant")}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      Grant
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submit(featureKey, "revoke")}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      Withhold
                    </button>
                    {overridden ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => submit(featureKey, "clear")}
                        className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:cursor-wait disabled:opacity-60"
                      >
                        Clear override
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={closeEditor}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(undefined);
                    setReason("");
                    setExpiresAt(feature.overrideExpiresAt?.slice(0, 16) ?? "");
                    setEditing(featureKey);
                  }}
                  className="text-xs font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
                >
                  Change access
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {feedback ? (
        <p
          className={`text-xs font-medium ${
            feedback.tone === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
