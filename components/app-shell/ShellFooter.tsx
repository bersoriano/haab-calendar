import Link from "next/link";

export function ShellFooter({
  links,
  note,
}: {
  links: { href: string; label: string; external?: boolean }[];
  note: string;
}) {
  const linkClass =
    "inline-flex min-h-11 items-center font-medium transition hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:min-h-0";

  return (
    <footer className="border-t border-[var(--line)] px-4 py-4 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{note}</p>
        <ul className="flex flex-wrap gap-x-5">
          {links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {link.label}
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
