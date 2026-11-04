import type { Lang } from "@/lib/types";

/** The blog's own words. Post text comes from `content/posts/`. */
export const blogCopy: Record<Lang, {
  blog: string;
  home: string;
  breadcrumb: string;
  title: string;
  description: string;
  empty: string;
  draft: string;
  allPosts: string;
  by: string;
  published: string;
  updated: string;
  keyTakeaway: string;
}> = {
  en: {
    blog: "Blog",
    home: "Home",
    breadcrumb: "Breadcrumb",
    title: "Online booking: practical guides",
    description: "Practical guides to taking bookings online and running a small business's calendar.",
    empty: "No posts yet.",
    draft: "Draft",
    allPosts: "← All posts",
    by: "By",
    published: "Published",
    updated: "Updated",
    keyTakeaway: "Key takeaway",
  },
  es: {
    blog: "Blog",
    home: "Inicio",
    breadcrumb: "Ruta de navegación",
    title: "Reservas en línea: guías prácticas",
    description: "Guías prácticas para recibir reservas en línea y organizar la agenda de un negocio pequeño.",
    empty: "Aún no hay publicaciones.",
    draft: "Borrador",
    allPosts: "← Todas las publicaciones",
    by: "Por",
    published: "Publicado",
    updated: "Actualizado",
    keyTakeaway: "Idea clave",
  },
};
