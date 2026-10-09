import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { bookingTranslations } from "@/components/booking/i18n/translations";
import { AvailabilitySettingsSection } from "@/components/provider/AvailabilitySettingsSection";
import { createEmptyStore } from "@/lib/store";

const en = bookingTranslations.en.admin;

function render(props: Partial<Parameters<typeof AvailabilitySettingsSection>[0]> = {}) {
  return renderToStaticMarkup(
    <AvailabilitySettingsSection
      vertical="healthcare"
      availability={createEmptyStore().availability}
      onChange={() => undefined}
      onManageEvents={() => undefined}
      lang="en"
      {...props}
    />,
  );
}

describe("AvailabilitySettingsSection", () => {
  it("edits weekly hours for appointment businesses", () => {
    const html = render();

    expect(html).toContain(en.weeklyAvailability);
    expect(html).toContain(en.weekdays.monday);
  });

  it("points events organisers at their events instead of weekly hours", () => {
    const onManageEvents = vi.fn();
    const html = render({ vertical: "events", onManageEvents });

    expect(html).toContain(en.eventSchedulingTitle);
    expect(html).toContain(en.manageEvents);
    expect(html).not.toContain(en.weekdays.monday);
    expect(onManageEvents).not.toHaveBeenCalled();
  });

  it("offers the daily booking limit only where it can be saved", () => {
    expect(render()).not.toContain('name="maxBookingsPerDay"');
    const withLimit = render({ onMaxBookingsPerDayChange: () => undefined });
    expect(withLimit.length).toBeGreaterThan(render().length);
  });
});
