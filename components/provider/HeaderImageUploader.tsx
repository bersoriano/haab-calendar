"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/app-ui";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_HEADER_IMAGE_BYTES,
  MAX_LOGO_IMAGE_BYTES,
  validateImageFile,
} from "@/lib/image-upload";
import type { Lang } from "@/lib/types";
import { bookingTranslations } from "@/components/booking/i18n/translations";

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
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium text-app-fg">{label}</p>
        <p className="mt-1 text-sm text-app-fg-muted">{hint}</p>
      </div>

      {value ? (
        <div
          className={cn(
            "overflow-hidden rounded-lg ring-1 ring-app-border",
            isLogo && "flex min-h-32 items-center justify-center bg-app-surface p-4",
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
            "flex w-full items-center justify-center rounded-lg border-2 border-dashed border-app-border-strong text-sm text-app-fg-muted",
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
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          disabled={disabled}
          leadingIcon={<UploadSimple aria-hidden="true" size={16} />}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t.providerForm.uploadingImage : value ? t.providerForm.replaceImage : t.providerForm.uploadImage}
        </Button>
        {value ? (
          <Button
            variant="danger-plain"
            size="sm"
            disabled={disabled || busy}
            onClick={() => {
              setError(null);
              onChange(undefined);
            }}
          >
            {t.providerForm.removeImage}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-app-danger-fg">
          {error}
        </p>
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
