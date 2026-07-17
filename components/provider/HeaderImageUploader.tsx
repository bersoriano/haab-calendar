"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_HEADER_IMAGE_BYTES,
  MAX_LOGO_IMAGE_BYTES,
  validateImageFile,
} from "@/lib/image-upload";
import type { Lang } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-[var(--ink)] ring-1 ring-[rgba(193,198,214,0.45)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_26px_rgba(25,28,29,0.05)] transition-colors hover:text-[var(--primary-container)] disabled:cursor-not-allowed disabled:opacity-45";

type ProviderImageKind = "header" | "logo";

type ProviderImageUploaderProps = {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled: boolean;
  lang: Lang;
  kind: ProviderImageKind;
};

function ProviderImageUploader({
  value,
  onChange,
  disabled,
  lang,
  kind,
}: ProviderImageUploaderProps) {
  const t = bookingTranslations[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLogo = kind === "logo";
  const maxBytes = isLogo ? MAX_LOGO_IMAGE_BYTES : MAX_HEADER_IMAGE_BYTES;
  const label = isLogo ? t.providerForm.logoImage : t.providerForm.headerImage;
  const hint = isLogo ? t.providerForm.logoImageHint : t.providerForm.headerImageHint;
  const previewAlt = isLogo
    ? t.providerForm.logoImagePreviewAlt
    : t.providerForm.headerImagePreviewAlt;
  const emptyLabel = isLogo
    ? t.providerForm.noLogoImage
    : t.providerForm.noHeaderImage;
  const sizeError = isLogo
    ? t.providerForm.logoImageSizeError
    : t.providerForm.imageSizeError;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    const check = validateImageFile(file, maxBytes);
    if (!check.ok) {
      setError(
        check.error === "Use a JPG, PNG, or WEBP image."
          ? t.providerForm.imageTypeError
          : sizeError,
      );
      return;
    }
    setBusy(true);
    try {
      const result = await upload(`provider-${kind}s/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type,
        clientPayload: kind,
      });
      onChange(result.url);
    } catch (uploadError) {
      let message = t.providerForm.imageUploadError;
      if (uploadError instanceof Error && uploadError.message) {
        message = uploadError.message;
      }
      setError(message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-2 text-sm font-medium text-[var(--ink)]">
      {label}
      <p className="text-xs leading-5 text-[var(--muted)]">{hint}</p>

      {value ? (
        <div
          className={cn(
            "overflow-hidden rounded-2xl ring-1 ring-[rgba(193,198,214,0.45)]",
            isLogo && "flex min-h-32 items-center justify-center bg-white p-4",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Blob URL, no layout shift concern in admin */}
          <img
            src={value}
            alt={previewAlt}
            className={isLogo ? "h-24 w-24 object-contain" : "aspect-[3/1] w-full object-cover"}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex w-full items-center justify-center rounded-2xl border border-dashed border-[rgba(193,198,214,0.55)] bg-[rgba(248,249,250,0.5)] text-xs text-[var(--muted)]",
            isLogo ? "min-h-32" : "aspect-[3/1]",
          )}
        >
          {emptyLabel}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_EXTENSIONS}
        disabled={disabled || busy}
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className={buttonClass}
        >
          {busy
            ? t.providerForm.uploadingImage
            : value
              ? t.providerForm.replaceImage
              : t.providerForm.uploadImage}
        </button>
        {value ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => {
              setError(null);
              onChange(undefined);
            }}
            className={cn(
              buttonClass,
              "text-[#be123c] hover:bg-[#fff1f2] hover:text-[#be123c]",
            )}
          >
            {t.providerForm.removeImage}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs font-medium text-[#be123c]">{error}</p>
      ) : null}
    </div>
  );
}

export function HeaderImageUploader({
  value,
  onChange,
  disabled = false,
  lang = "en",
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  return (
    <ProviderImageUploader
      value={value}
      onChange={onChange}
      disabled={disabled}
      lang={lang}
      kind="header"
    />
  );
}

export function LogoImageUploader({
  value,
  onChange,
  disabled = false,
  lang = "en",
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  return (
    <ProviderImageUploader
      value={value}
      onChange={onChange}
      disabled={disabled}
      lang={lang}
      kind="logo"
    />
  );
}
