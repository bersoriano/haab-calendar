import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BookingRetentionSettings } from "@/components/provider/BookingRetentionSettings";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { resolveEntitlements } from "@/lib/entitlements/resolve";

const premium = resolveEntitlements({ providerId: "p", planTier: "premium", overrides: [] });
const free = resolveEntitlements({ providerId: "p", planTier: "free", overrides: [] });
function render(props: Partial<Parameters<typeof BookingRetentionSettings>[0]> = {}) {
  return renderToStaticMarkup(<BookingRetentionSettings lang="en" enabled={false} savedEnabled={false} entitlements={premium} disabled={false} onChange={() => {}} {...props} />);
}

describe("BookingRetentionSettings", () => {
  it("starts off for Premium and clearly shows permanent one-month deletion", () => {
    const html = render();
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('checked=""');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain(dashboardCopy.en.retentionMonth);
    expect(html).toContain(dashboardCopy.en.retentionDefaultOff);
  });
  it("locks the free opt-in but permits switching an old preference off after downgrade", () => {
    expect(render({ entitlements: free })).toContain('disabled=""');
    const downgraded = render({ entitlements: free, enabled: true, savedEnabled: true });
    expect(downgraded).not.toContain('disabled=""');
    expect(downgraded).toContain(dashboardCopy.en.retentionMonth);
    expect(downgraded).not.toContain(dashboardCopy.en.retentionYear);
  });
  it("keeps saved policy visible while a checkbox change awaits saving", () => {
    const pending = render({ enabled: true });
    expect(pending).toContain(dashboardCopy.en.retentionPending);
    expect(pending).toContain(dashboardCopy.en.retentionMonth);
    expect(pending).not.toContain(dashboardCopy.en.retentionYear);
    expect(render({ enabled: true, savedEnabled: true })).toContain(dashboardCopy.en.retentionYear);
  });
  it("shows unknown access without claiming a shorter deletion policy", () => {
    const html = render({ enabled: true, savedEnabled: true, entitlements: undefined });
    expect(html).toContain(dashboardCopy.en.retentionUnknown);
    expect(html).not.toContain(dashboardCopy.en.retentionMonth);
  });
  it("uses Spanish labels and disables edits while saving", () => {
    const html = render({ lang: "es", disabled: true });
    expect(html).toContain(dashboardCopy.es.retentionOption);
    expect(html).toContain(dashboardCopy.es.retentionDefaultOff);
    expect(html).toContain('disabled=""');
    expect(html).not.toContain(dashboardCopy.en.retentionOption);
  });
});
