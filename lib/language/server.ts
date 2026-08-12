import "server-only";

import { cookies, headers } from "next/headers";

import type { Lang } from "@/lib/types";
import { LANGUAGE_COOKIE, resolveLanguage } from "./resolve";

/**
 * The language for a server render. `explicit` is the page's own `?lang`
 * search param when it has one; the cookie is what the proxy already resolved.
 */
export async function getServerLanguage(explicit?: string): Promise<Lang> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  return resolveLanguage({
    explicit,
    cookie: cookieStore.get(LANGUAGE_COOKIE)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
}
