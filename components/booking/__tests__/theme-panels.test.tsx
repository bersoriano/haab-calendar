import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceStepIntro } from "@/components/booking/ServiceStepIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublicProgressIndicator } from "@/components/ui/PublicProgressIndicator";
import { ToneBadge } from "@/components/ui/ToneBadge";

describe("public booking panels", () => {
  it("uses theme surfaces for empty states and neutral labels", () => {
    expect(renderToStaticMarkup(<EmptyState title="No slots" body="Choose another date." />))
      .toContain("bg-[var(--panel-mute-88)]");
    expect(renderToStaticMarkup(<ToneBadge tone="secondary">Appointment</ToneBadge>))
      .toContain("bg-[var(--panel-mute-72)]");
  });

  it("uses theme surfaces for upcoming steps", () => {
    const intro = renderToStaticMarkup(
      <ServiceStepIntro title="Choose service" body="Select one." serviceLabel="Service" lang="en" />,
    );
    const progress = renderToStaticMarkup(
      <PublicProgressIndicator currentStep={2} isDedicatedPublicPage lang="en" />,
    );

    expect(intro).toContain("bg-[var(--panel-glass-75)] text-[var(--muted)]");
    expect(progress).toContain("bg-[var(--panel-glass-55)] text-[var(--muted)]");
  });
});
