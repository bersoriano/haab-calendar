"use client";

import type { ProviderInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminFieldClass } from "@/components/provider/adminGlass";
import { HeaderImageUploader } from "@/components/provider/HeaderImageUploader";

export function ProviderInfoForm({
  provider,
  onChange,
  disabled = false,
}: {
  provider: ProviderInfo;
  onChange: <K extends keyof ProviderInfo>(key: K, value: ProviderInfo[K]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        Full name
        <input
          disabled={disabled}
          value={provider.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder="Dr. Maya Alvarez"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        Business name
        <input
          disabled={disabled}
          value={provider.businessName}
          onChange={(event) => onChange("businessName", event.target.value)}
          placeholder="Haab Health Studio"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        Confirmation email
        <input
          disabled={disabled}
          value={provider.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="bookings@haabcalendar.com"
          type="email"
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          Phone Number 1
          <input
            disabled={disabled}
            value={provider.phoneNumber1}
            onChange={(event) => onChange("phoneNumber1", event.target.value)}
            placeholder="+1 (555) 123-4567"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          Phone Number 2
          <input
            disabled={disabled}
            value={provider.phoneNumber2}
            onChange={(event) => onChange("phoneNumber2", event.target.value)}
            placeholder="Optional secondary number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          Address 1
          <input
            disabled={disabled}
            value={provider.address1}
            onChange={(event) => onChange("address1", event.target.value)}
            placeholder="123 Main St, Suite 4, Springfield"
            autoComplete="street-address"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
          Address 2
          <input
            disabled={disabled}
            value={provider.address2}
            onChange={(event) => onChange("address2", event.target.value)}
            placeholder="Optional secondary location"
            autoComplete="street-address"
            className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
          />
        </label>
      </div>
      <HeaderImageUploader
        value={provider.headerImageUrl}
        onChange={(url) => onChange("headerImageUrl", url)}
        disabled={disabled}
      />
    </div>
  );
}
