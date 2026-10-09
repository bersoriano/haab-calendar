import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Files rebuilt on components/app-ui. Each dashboard UI PR appends what it
// migrates; the last one replaces the list with whole directories. The
// public primitives stay available to the booking flow, just not here.
const MIGRATED_TO_APP_UI = [
  "components/app-shell/**/*.{ts,tsx}",
  "components/provider/DashboardApp.tsx",
  "components/provider/SaveBar.tsx",
  "components/provider/CampaignBadge.tsx",
  "components/provider/DashboardOverview.tsx",
  "components/provider/BookingsList.tsx",
  "components/provider/AdminCalendar.tsx",
  "components/provider/ProviderAnalyticsSurface.tsx",
  "components/provider/CancelBookingDialog.tsx",
  "components/provider/RescheduleBookingDialog.tsx",
  "components/provider/ToastOnChange.tsx",
  "components/provider/AppointmentScannerDialog.tsx",
  "components/provider/ProviderInfoForm.tsx",
  "components/provider/TimeZoneField.tsx",
  "components/provider/ServiceEditor.tsx",
  "components/provider/AvailabilitySettingsSection.tsx",
  "components/provider/AvailabilityEditor.tsx",
  "components/provider/DailyBookingLimitField.tsx",
  "components/provider/AppearanceSection.tsx",
  "components/provider/HeaderImageUploader.tsx",
  "components/provider/ProviderAppearanceForm.tsx",
  "components/provider/ThemeSettingsSection.tsx",
  "components/provider/LanguageSettingsSection.tsx",
  "components/provider/ProviderIntegrationsSection.tsx",
  "components/provider/GoogleCalendarCapabilities.tsx",
  "components/super-admin/SuperAdminShell.tsx",
];

const LEGACY_UI = ["ActionButton", "ActionLink", "buttonClasses", "ToneBadge", "EmptyState", "SectionTitle", "Alert"];
const LEGACY_UI_MESSAGE = "Signed-in surfaces use @/components/app-ui; components/ui is the public booking look.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: MIGRATED_TO_APP_UI,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/components/provider/adminGlass", message: LEGACY_UI_MESSAGE },
            { name: "@/components/ui", importNames: LEGACY_UI, message: LEGACY_UI_MESSAGE },
            ...LEGACY_UI.map((name) => ({ name: `@/components/ui/${name}`, message: LEGACY_UI_MESSAGE })),
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output, not source: the v8 reporter ships its own HTML and JS,
    // and linting it reports on code nobody here wrote.
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
