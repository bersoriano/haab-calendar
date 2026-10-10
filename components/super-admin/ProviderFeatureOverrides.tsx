"use client";

import { useState } from "react";

import { Alert, Badge, Button, Dialog, Field, Input } from "@/components/app-ui";
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

type OverrideAction = "grant" | "revoke" | "clear";

function formatUtcDate(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function enabledCount(snapshot: ProviderEntitlements) {
  return FEATURE_KEYS.filter((featureKey) => snapshot.features[featureKey].enabled).length;
}

function listFeatures(keys: readonly FeatureKey[]) {
  return keys.map((key) => FEATURE_LABELS[key]).join(" and ");
}

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

/** The accounts row's one line about premium access. */
export function FeatureAccessSummary({ entitlements }: { entitlements: ProviderEntitlements }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge>{entitlements.planTier} plan</Badge>
      <span className="text-xs text-app-fg-muted">
        {enabledCount(entitlements)} of {FEATURE_KEYS.length} enabled
      </span>
    </span>
  );
}

/**
 * Per-provider feature state, and the controls to change it.
 *
 * Everything shown here is resolved server-side and re-read after each write,
 * so the dialog reports what the database decided rather than what the click
 * implied; `onChange` hands that snapshot back to the row. A reason is
 * mandatory in the form because it is mandatory in the audit trail.
 */
export function ProviderFeatureOverrides({
  open,
  onClose,
  onChange,
  ownerEmail,
  entitlements,
}: {
  open: boolean;
  onClose: () => void;
  onChange: (snapshot: ProviderEntitlements) => void;
  ownerEmail: string;
  entitlements: ProviderEntitlements;
}) {
  const snapshot = entitlements;
  const [editing, setEditing] = useState<FeatureKey>();
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pendingAction, setPendingAction] = useState<OverrideAction>();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  }>();
  const busy = pendingAction !== undefined;

  function closeEditor() {
    setEditing(undefined);
    setReason("");
    setExpiresAt("");
  }

  async function send(request: OverrideRequest, action: OverrideAction, successMessage: string) {
    setPendingAction(action);
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

      onChange(result);
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
      setPendingAction(undefined);
    }
  }

  function submit(featureKey: FeatureKey, action: OverrideAction) {
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

      return send(request, action, successMessage);
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
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Premium access"
      description={
        <>
          <span className="break-words">{ownerEmail}</span> · {snapshot.planTier} plan ·{" "}
          {enabledCount(snapshot)} of {FEATURE_KEYS.length} enabled
        </>
      }
      size="md"
      closeLabel="Close"
    >
      {feedback ? (
        <Alert
          tone={feedback.tone === "success" ? "success" : "danger"}
          role={feedback.tone === "error" ? "alert" : "status"}
          className="mb-3"
        >
          {feedback.message}
        </Alert>
      ) : null}

      <ul role="list" className="-mx-4 divide-y divide-app-border border-y border-app-border sm:-mx-6">
        {FEATURE_KEYS.map((featureKey) => {
          const feature = snapshot.features[featureKey];
          const overridden = feature.source === "override";
          const isEditing = editing === featureKey;

          // Two different moments, both worth showing.
          //
          // `unmetPrerequisites` is the resolver's verdict on a grant that has
          // already been made: something switched this feature on, a capability
          // it depends on is off, and the answer is therefore still no. Without
          // it the dialog reports the grant as saved and the feature as Off,
          // with nothing connecting the two.
          //
          // `missing` is the same question asked before granting, so the
          // support case where someone grants two-way, watches it do nothing,
          // and has no way to find out why simply does not start.
          const blockedBy = feature.unmetPrerequisites ?? [];
          const missing = blockingPrerequisites(snapshot, featureKey);

          return (
            <li key={featureKey} className="px-4 py-3 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-app-fg">{FEATURE_LABELS[featureKey]}</span>
                    <Badge tone={feature.enabled ? "success" : "neutral"}>{feature.enabled ? "On" : "Off"}</Badge>
                    {overridden ? <Badge tone="warning">Override</Badge> : null}
                    {blockedBy.length > 0 ? <Badge tone="danger">Blocked</Badge> : null}
                  </div>
                  {overridden && feature.overrideExpiresAt ? (
                    <p className="mt-1 text-xs text-app-fg-muted">
                      Expires {formatUtcDate(feature.overrideExpiresAt)} UTC
                    </p>
                  ) : null}
                  {blockedBy.length > 0 ? (
                    <p className="mt-1 text-xs font-medium text-app-danger-fg">
                      Granted, but off: needs {listFeatures(blockedBy)}.
                    </p>
                  ) : null}
                </div>
                {!isEditing ? (
                  <Button
                    variant="plain"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setFeedback(undefined);
                      setReason("");
                      setExpiresAt(feature.overrideExpiresAt?.slice(0, 16) ?? "");
                      setEditing(featureKey);
                    }}
                  >
                    Change access
                  </Button>
                ) : null}
              </div>
              {isEditing ? (
                <div className="mt-3 grid gap-3 rounded-lg bg-app-subtle p-3">
                  <Field label="Reason">
                    <Input
                      type="text"
                      value={reason}
                      maxLength={500}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder={`Why ${ownerEmail} needs this change`}
                    />
                  </Field>
                  <Field label="Expires" description="Optional — blank means permanent.">
                    <Input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                    />
                  </Field>
                  {missing.length > 0 ? (
                    <Alert tone="warning">
                      Turn on {listFeatures(missing)} first. Granting this alone leaves it off.
                    </Alert>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      // A disabled button is a courtesy, not the rule: the
                      // resolver refuses an unmet prerequisite whatever the UI
                      // allows. Withhold and Clear are never blocked by
                      // prerequisites, because taking access away must not
                      // depend on anything.
                      disabled={busy || missing.length > 0}
                      loading={pendingAction === "grant"}
                      title={missing.length > 0 ? `Requires ${listFeatures(missing)}` : undefined}
                      onClick={() => submit(featureKey, "grant")}
                    >
                      Grant
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      loading={pendingAction === "revoke"}
                      onClick={() => submit(featureKey, "revoke")}
                    >
                      Withhold
                    </Button>
                    {overridden ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        loading={pendingAction === "clear"}
                        onClick={() => submit(featureKey, "clear")}
                      >
                        Clear override
                      </Button>
                    ) : null}
                    <Button variant="plain" size="sm" disabled={busy} onClick={closeEditor}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
