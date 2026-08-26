"use client";

import { CaretDown, SlidersHorizontal } from "@phosphor-icons/react";
import { useState } from "react";

import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  getFeaturePrerequisites,
  type FeatureKey,
} from "@/lib/entitlements/catalog";
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
/**
 * The prerequisites that would keep a grant from taking effect right now.
 *
 * Exported so it can be tested directly: the button it disables only renders
 * after a click, and these tests render statically.
 */
export function blockingPrerequisites(
  snapshot: ProviderEntitlements,
  featureKey: FeatureKey,
): readonly FeatureKey[] {
  return getFeaturePrerequisites(featureKey).filter(
    (prerequisite) => !snapshot.features[prerequisite].enabled,
  );
}

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
  const enabledCount = FEATURE_KEYS.filter(
    (featureKey) => snapshot.features[featureKey].enabled,
  ).length;

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

  function submit(
    featureKey: FeatureKey,
    action: "grant" | "revoke" | "clear",
  ) {
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
    <details className="group w-[21rem] max-w-full rounded-2xl border border-[var(--line)] bg-white shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 outline-none transition hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--primary)]">
          <SlidersHorizontal aria-hidden="true" size={18} weight="bold" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[var(--ink)]">
              Premium access
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600">
              {snapshot.planTier} plan
            </span>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="flex gap-1" aria-hidden="true">
              {FEATURE_KEYS.map((featureKey) => (
                <span
                  key={featureKey}
                  className={`h-1.5 w-5 rounded-full ${
                    snapshot.features[featureKey].enabled
                      ? "bg-emerald-500"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {enabledCount} of {FEATURE_KEYS.length} enabled
            </span>
          </span>
          <span className="sr-only">Manage premium access</span>
        </span>
        <CaretDown
          aria-hidden="true"
          className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180"
          size={16}
          weight="bold"
        />
      </summary>

      <div className="border-t border-[var(--line)] px-3 py-2">
        <ul className="divide-y divide-[var(--line)]">
          {FEATURE_KEYS.map((featureKey) => {
            const feature = snapshot.features[featureKey];
            const overridden = feature.source === "override";
            const open = editing === featureKey;

            // Two different moments, both worth showing.
            //
            // `unmetPrerequisites` is the resolver's verdict on a grant that has
            // already been made: something switched this feature on, a capability
            // it depends on is off, and the answer is therefore still no. Without
            // it the panel reports the grant as saved and the feature as Off,
            // with nothing connecting the two.
            //
            // `missing` is the same question asked before granting, so the
            // support case where someone grants two-way, watches it do nothing,
            // and has no way to find out why simply does not start.
            const blockedBy = feature.unmetPrerequisites ?? [];
            const missing = blockingPrerequisites(snapshot, featureKey);
            const listFeatures = (keys: readonly FeatureKey[]) =>
              keys.map((key) => FEATURE_LABELS[key]).join(" and ");

            return (
              <li key={featureKey} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${
                          feature.enabled ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span className="text-sm font-medium leading-5 text-[var(--ink)]">
                        {FEATURE_LABELS[featureKey]}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                          feature.enabled
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {feature.enabled ? "On" : "Off"}
                      </span>
                      {overridden ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800">
                          Override
                        </span>
                      ) : null}
                      {blockedBy.length > 0 ? (
                        <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-rose-800">
                          Blocked
                        </span>
                      ) : null}
                    </div>
                    {overridden && feature.overrideExpiresAt ? (
                      <p className="mt-1 pl-3.5 text-xs text-[var(--muted)]">
                        Expires {formatUtcDate(feature.overrideExpiresAt)} UTC
                      </p>
                    ) : null}
                    {blockedBy.length > 0 ? (
                      <p className="mt-1 pl-3.5 text-xs font-medium text-rose-700">
                        Granted, but off: needs {listFeatures(blockedBy)}.
                      </p>
                    ) : null}
                  </div>
                  {!open ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFeedback(undefined);
                        setReason("");
                        setExpiresAt(
                          feature.overrideExpiresAt?.slice(0, 16) ?? "",
                        );
                        setEditing(featureKey);
                      }}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-[var(--primary)] outline-none transition hover:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      Change access
                    </button>
                  ) : null}
                </div>
                {open ? (
                  <div className="mt-3 space-y-3 rounded-xl bg-[var(--surface-soft)] p-3">
                    <label className="block text-xs font-semibold text-[var(--ink)]">
                      Reason
                      <input
                        type="text"
                        value={reason}
                        maxLength={500}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={`Why ${ownerEmail} needs this change`}
                        className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-normal text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[var(--ink)]">
                      Expires (optional — blank means permanent)
                      <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(event) => setExpiresAt(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-normal text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      />
                    </label>
                    {missing.length > 0 ? (
                      <p className="text-xs font-medium text-amber-800">
                        Turn on {listFeatures(missing)} first. Granting this
                        alone leaves it off.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        // A disabled button is a courtesy, not the rule: the
                        // resolver refuses an unmet prerequisite whatever the UI
                        // allows. Withhold and Clear are never disabled, because
                        // taking access away must not depend on anything.
                        disabled={busy || missing.length > 0}
                        title={
                          missing.length > 0
                            ? `Requires ${listFeatures(missing)}`
                            : undefined
                        }
                        onClick={() => submit(featureKey, "grant")}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                ) : null}
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
    </details>
  );
}
