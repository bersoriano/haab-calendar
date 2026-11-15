import { invitationCopy } from "@/components/invitations/invitation-copy";

/**
 * One page for every bad invitation link: unknown, replaced, malformed, or on
 * a page that does not take invitations. It says nothing about which, and
 * shows nothing of the page, so a guess learns nothing. The language is not
 * known here, so it speaks both.
 */
export default function InvitationNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-16">
      {(["es", "en"] as const).map((lang) => (
        <section key={lang} lang={lang} className="grid gap-2">
          <h1 className="text-2xl font-semibold text-app-fg">{invitationCopy[lang].invalidTitle}</h1>
          <p className="text-app-fg-muted">{invitationCopy[lang].invalidBody}</p>
        </section>
      ))}
    </main>
  );
}
