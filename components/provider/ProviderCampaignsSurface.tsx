"use client";

import { Check, Copy, Megaphone } from "@phosphor-icons/react";
import { useCallback, useState, useSyncExternalStore } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/app-ui";
import { analyticsCopy } from "@/components/provider/analytics-copy";
import { campaignsCopy, type CampaignsCopy } from "@/components/provider/campaigns-copy";
import { UpgradeCard } from "@/components/provider/ProviderAnalyticsSurface";
import { useAnalyticsSummary } from "@/components/provider/use-analytics-summary";
import {
  ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  buildCampaignUrl,
  isAnalyticsTeaser,
  type AnalyticsRange,
  type AnalyticsSummary,
} from "@/lib/analytics/summary";
import type { Lang } from "@/lib/types";

export type ProviderCampaignsSurfaceProps = {
  lang: Lang;
  /** Path of the public booking page, e.g. `/professionals/ai-automation`. */
  publicUrl: string;
  integratedMode: boolean;
};

/**
 * The Campaigns section: make a labelled link for each place the booking page
 * is shared, and see the visits and bookings each link brought. Building links
 * is open to every plan; /api/provider/analytics decides who sees results.
 */
export function ProviderCampaignsSurface({
  lang,
  publicUrl,
  integratedMode,
}: ProviderCampaignsSurfaceProps) {
  const t = campaignsCopy[lang];

  if (!integratedMode) {
    return (
      <EmptyState
        variant="dashed"
        icon={<Megaphone aria-hidden="true" size={32} />}
        title={t.previewTitle}
        body={t.previewBody}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CampaignLinkBuilder t={t} publicUrl={publicUrl} />
      <CampaignResultsPanel t={t} lang={lang} />
    </div>
  );
}

const subscribeToNothing = () => () => undefined;
const readOrigin = () => window.location.origin;
const readNoOrigin = () => "";

function CampaignLinkBuilder({ t, publicUrl }: { t: CampaignsCopy; publicUrl: string }) {
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(subscribeToNothing, readOrigin, readNoOrigin);

  const link = origin ? buildCampaignUrl(`${origin}${publicUrl}`, { source, medium, campaign }) : "";

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [link]);

  const fields = [
    { ...t.source, value: source, set: setSource },
    { ...t.medium, value: medium, set: setMedium },
    { ...t.campaign, value: campaign, set: setCampaign },
  ];

  return (
    <Card as="section">
      <CardHeader title={t.builderTitle} description={t.builderBody} />
      <CardBody className="grid gap-6">
        <div>
          <h3 className="text-sm font-semibold text-app-fg">{t.stepsTitle}</h3>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2">
            {t.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-app-subtle text-xs font-semibold text-app-accent"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 text-app-fg-muted">
                  <span className="font-semibold text-app-fg">{step.title}</span> {step.body}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-3">
          {fields.map((field) => (
            <Field key={field.label} label={field.label} description={field.hint}>
              <Input
                value={field.value}
                maxLength={100}
                placeholder={field.placeholder}
                onChange={(event) => field.set(event.target.value)}
              />
            </Field>
          ))}
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-semibold text-app-fg">{t.linkLabel}</h3>
          <div className="flex flex-col gap-3 rounded-lg bg-app-subtle p-4 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all text-sm text-app-fg">{link}</code>
            <Button
              disabled={!link}
              onClick={copyLink}
              leadingIcon={copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
            >
              {copied ? t.copied : t.copy}
            </Button>
          </div>
          <p className="text-sm text-app-fg-muted">{source.trim() ? t.linkTip : t.linkNeedsSource}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function CampaignResultsPanel({ t, lang }: { t: CampaignsCopy; lang: Lang }) {
  const [range, setRange] = useState<AnalyticsRange>(DEFAULT_ANALYTICS_RANGE);
  const { state, retry } = useAnalyticsSummary(range);

  return (
    <Card as="section">
      <CardHeader
        title={t.resultsTitle}
        description={t.resultsBody}
        actions={
          <SegmentedControl
            ariaLabel={t.resultsTitle}
            value={String(range)}
            onChange={(value) => setRange(Number(value) as AnalyticsRange)}
            options={ANALYTICS_RANGES.map((days) => ({ value: String(days), label: t.rangeLabel(days) }))}
          />
        }
      />
      {!state ? (
        <CardBody>
          <p className="text-sm text-app-fg-muted" role="status">
            {t.loading}
          </p>
        </CardBody>
      ) : state.status === "error" ? (
        <EmptyState title={t.loadFailed} action={<Button onClick={retry}>{t.retry}</Button>} />
      ) : isAnalyticsTeaser(state.summary) ? (
        <CardBody className="flex justify-center">
          <UpgradeCard t={analyticsCopy[lang]} body={t.lockedBody} />
        </CardBody>
      ) : (
        <CampaignResults summary={state.summary} lang={lang} />
      )}
    </Card>
  );
}

/** Presentational: the results card's body, from one summary. */
export function CampaignResults({ summary, lang }: { summary: AnalyticsSummary; lang: Lang }) {
  const t = campaignsCopy[lang];
  const number = new Intl.NumberFormat(lang === "es" ? "es-MX" : "en-US");

  if (summary.campaigns.length === 0) {
    return <EmptyState title={t.resultsEmptyTitle} body={t.resultsEmptyBody} />;
  }

  return (
    <>
      <Table className="min-w-[520px]">
        <THead>
          <Tr>
            {t.columns.map((column, index) => (
              <Th key={column} align={index > 2 ? "right" : "left"}>
                {column}
              </Th>
            ))}
          </Tr>
        </THead>
        <TBody>
          {summary.campaigns.map((row) => {
            const untagged = !row.source && !row.medium && !row.campaign;
            return (
              <Tr key={`${row.source}|${row.medium}|${row.campaign}`}>
                {untagged ? (
                  <Td className="text-app-fg-muted">
                    <span>{t.direct}</span>
                  </Td>
                ) : (
                  <Td className="font-medium text-app-fg">{row.source ?? t.none}</Td>
                )}
                <Td>{untagged ? "" : (row.medium ?? t.none)}</Td>
                <Td>{untagged ? "" : (row.campaign ?? t.none)}</Td>
                <Td align="right" className="tabular-nums">
                  {number.format(row.views)}
                </Td>
                <Td align="right" className="font-semibold text-app-fg tabular-nums">
                  {number.format(row.bookings)}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>

      <CardBody className="border-t border-app-border py-3">
        <p className="text-xs text-app-fg-muted">{t.directNote}</p>
      </CardBody>

      {summary.referrers.length > 0 ? (
        <CardBody className="border-t border-app-border">
          <h3 className="text-sm font-semibold text-app-fg">{t.referrersTitle}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.referrers.map((referrer) => (
              <li key={referrer.host}>
                <Badge tone="neutral">
                  <span className="font-semibold">{referrer.host}</span> · {number.format(referrer.views)}
                </Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      ) : null}
    </>
  );
}
