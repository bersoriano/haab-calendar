import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClientOnly } from "@/components/ui/ClientOnly";

describe("ClientOnly", () => {
  it("renders the fallback on the server, never the children", () => {
    const html = renderToStaticMarkup(
      <ClientOnly fallback={<p>loading</p>}>
        <p>browser-only</p>
      </ClientOnly>,
    );

    expect(html).toContain("loading");
    expect(html).not.toContain("browser-only");
  });
});
