import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DetailsForm } from "@/components/booking/DetailsForm";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { getVerticalCopy } from "@/lib/vertical-copy";

const empty = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  partySize: "",
  dateOfBirth: "",
  notes: "",
};

function renderForm(lang: "en" | "es") {
  return renderToStaticMarkup(
    <DetailsForm
      values={empty}
      onChange={() => undefined}
      showPartySize={false}
      showDateOfBirth={false}
      invalidRequired={false}
      complete={false}
      errorId="error"
      copy={getVerticalCopy("healthcare", lang)}
      lang={lang}
    />,
  );
}

describe("the booking form's notice about keeping contact details", () => {
  it.each(["en", "es"] as const)("tells the person before they book, in %s", (lang) => {
    const html = renderForm(lang);

    expect(html).toContain(bookingTranslations[lang].publicFlow.contactNotice);
    expect(html).toContain(`href="/privacy?lang=${lang}#data-customer"`);
  });
});
