import type { ReactNode } from "react";

import { BrandMark, Card } from "@/components/app-ui";

/**
 * Every auth page: the app's bar, then the mark and the page heading centred
 * above one card that holds the form. Anything that belongs after the form
 * (a way back, a hint) goes in `footer`, below the card.
 */
export function AuthPageFrame({
  lang,
  header,
  title,
  body,
  footer,
  children,
}: {
  lang: string;
  header: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div lang={lang} className="flex min-h-screen flex-col bg-app-canvas">
      {header}
      <main className="flex flex-1 flex-col items-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          <div className="text-center">
            <BrandMark size="lg" className="mx-auto" />
            <h1 className="mt-6 text-balance text-2xl font-bold tracking-tight text-app-fg">{title}</h1>
            {body ? <p className="mx-auto mt-2 max-w-sm text-sm text-app-fg-muted">{body}</p> : null}
          </div>
          <Card className="mt-8 px-4 py-6 sm:px-8 sm:py-8">{children}</Card>
          {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
