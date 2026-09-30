/**
 * How many examples there are is written once, in DEMO_PAGES. Copy that names
 * the number carries a {n} placeholder instead, because a hand-written count
 * goes stale the moment a demo is added.
 */
export function formatDemoCount(template: string, count: number) {
  return template.replace("{n}", String(count));
}
