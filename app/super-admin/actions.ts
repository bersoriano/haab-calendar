"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { DEMO_EDIT_COOKIE, findDemoPage } from "@/lib/demo-pages";
import { requireSuperAdmin } from "@/lib/supabase/publication";
import { buildDemoEditCookie } from "@/lib/supabase/demo-edit";

/**
 * Starts a demo-editing session: the dashboard at `/` then loads and saves the
 * chosen example page instead of the caller's own booking page.
 */
export async function startDemoEdit(formData: FormData) {
  const page = findDemoPage(String(formData.get("demoKey") || ""));
  let isSuperAdmin = false;

  try {
    await requireSuperAdmin();
    isSuperAdmin = true;
  } catch {
    isSuperAdmin = false;
  }

  if (!isSuperAdmin) {
    redirect("/");
  }

  if (!page) {
    redirect("/super-admin");
  }

  const cookie = buildDemoEditCookie(page.key);
  const cookieStore = await cookies();
  cookieStore.set(cookie.name, cookie.value, cookie.options);

  revalidatePath("/", "layout");
  redirect("/");
}

export async function stopDemoEdit() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_EDIT_COOKIE);

  revalidatePath("/", "layout");
  redirect("/super-admin");
}
