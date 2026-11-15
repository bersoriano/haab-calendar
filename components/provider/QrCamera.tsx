"use client";

import { UploadSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import type { BrowserQRCodeReader as BrowserQRCodeReaderType, IScannerControls } from "@zxing/browser";

import { Alert, buttonStyles } from "@/components/app-ui";

/**
 * A camera that reads one QR code, then stops; mount it again (a new `key`)
 * to scan the next. With no camera, a photo of the code works too. Decoding
 * happens on the device.
 */
export function QrCamera({
  onCode,
  copy,
}: {
  onCode: (text: string) => void;
  copy: { starting: string; scanning: string; cameraUnavailable: string; upload: string; imageUnreadable: string };
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserQRCodeReaderType | null>(null);
  const handledRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  // The latest handler, without restarting the camera each time the parent renders.
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;

    async function start() {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 });
        readerRef.current = reader;
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _error, active) => {
            if (!result || handledRef.current) return;
            handledRef.current = true;
            active.stop();
            onCodeRef.current(result.getText());
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("scanning");
      } catch {
        if (!cancelled) {
          setError(copy.cameraUnavailable);
          setStatus("error");
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [copy.cameraUnavailable, stop]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    stop();
    const url = URL.createObjectURL(file);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = readerRef.current ?? new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(url);
      handledRef.current = true;
      onCodeRef.current(result.getText());
    } catch {
      setError(copy.imageUnreadable);
      setStatus("error");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-app-fg">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-[14%] rounded-lg border-2 border-app-surface/80" />
      </div>
      {error ? (
        <Alert tone="warning" role="alert">
          {error}
        </Alert>
      ) : (
        <p role="status" aria-live="polite" className="text-sm font-medium text-app-fg-muted">
          {status === "starting" ? copy.starting : copy.scanning}
        </p>
      )}
      <label
        className={buttonStyles({
          variant: "secondary",
          className: "cursor-pointer justify-self-start has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-app-accent",
        })}
      >
        <UploadSimple aria-hidden="true" size={16} />
        {copy.upload}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void upload(event)} />
      </label>
    </div>
  );
}
