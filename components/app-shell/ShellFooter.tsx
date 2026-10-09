import Link from "next/link";

export function ShellFooter({
  links,
  note,
  newTabLabel,
}: {
  links: { href: string; label: string; external?: boolean }[];
  note: string;
  /** Read after external links, e.g. "(opens in a new tab)". */
  newTabLabel?: string;
}) {
  const linkClass =
    "inline-flex min-h-11 items-center rounded-md transition-colors hover:text-app-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent sm:min-h-0";

  return (
    <footer className="border-t border-app-border px-4 py-6 text-sm text-app-fg-muted sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{note}</p>
        <ul className="flex flex-wrap gap-x-5">
          {links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {link.label}
                  {newTabLabel ? <span className="sr-only"> {newTabLabel}</span> : null}
                </a>
              ) : (
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
