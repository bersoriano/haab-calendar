import { describe, expect, it } from "vitest";
import { dashboardCopy, sectionTitle } from "@/components/provider/dashboard-copy";
import { DASHBOARD_SECTIONS, GOOGLE_OUTCOMES } from "@/lib/dashboard-routes";
import { getVerticalCopy } from "@/lib/vertical-copy";

describe("dashboard shell copy", () => {
  it("titles and describes every section in both languages", () => {
    for (const lang of ["en", "es"] as const) {
      for (const section of DASHBOARD_SECTIONS) {
        expect(dashboardCopy[lang].descriptions[section.id]).toBeTruthy();
        expect(sectionTitle(section.id, lang, getVerticalCopy("events", lang))).toBeTruthy();
      }
    }
  });

  it("words every Google outcome in both languages", () => {
    for (const outcome of GOOGLE_OUTCOMES) {
      expect(dashboardCopy.en.google[outcome]).toBeTruthy();
      expect(dashboardCopy.es.google[outcome]).toBeTruthy();
      expect(dashboardCopy.es.google[outcome]).not.toBe(dashboardCopy.en.google[outcome]);
    }
  });

  it("never reuses an English string in Spanish", () => {
    const en = dashboardCopy.en;
    const es = dashboardCopy.es;

    for (const key of ["copyLink", "viewPage", "signOut", "openMenu", "skipToContent"] as const) {
      expect(es[key]).not.toBe(en[key]);
    }
  });

  it("words toasts in both languages", () => {
    for (const key of ["linkCopiedToast", "dismiss", "opensInNewTab", "changesSaved", "cancelledToast", "rescheduledToast", "viewAll", "closeDialog", "moreBookings", "deleteServiceTitle", "deleteServiceBody", "keep", "disconnectGoogleTitle", "disconnectGoogleBody", "keepConnected", "resetSetupTitle", "resetSetupBody", "keepSetup", "closedDay"] as const) {
      expect(dashboardCopy.en[key]).toBeTruthy();
      expect(dashboardCopy.es[key]).toBeTruthy();
      expect(dashboardCopy.es[key]).not.toBe(dashboardCopy.en[key]);
    }
  });

  it("names bookings and services with the vertical's own words", () => {
    const restaurant = getVerticalCopy("restaurant", "en");

    expect(sectionTitle("bookings", "en", restaurant)).toBe(restaurant.Bookings);
    expect(sectionTitle("services", "en", restaurant)).toBe(restaurant.Services);
  });
});
