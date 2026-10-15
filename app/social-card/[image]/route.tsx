import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { translations, type Lang } from "@/components/landing/translations";
import { formatTimeLabel } from "@/lib/format";
import { SITE_NAME, SOCIAL_CARD_SIZE } from "@/lib/site-metadata";
import { getSiteOrigin } from "@/lib/site-url";

/**
 * The image a link preview shows, in each landing language:
 * /social-card/en.png and /social-card/es.png. The extension is not decoration:
 * it keeps these URLs out of the proxy's matcher, like every other image.
 *
 * A route handler rather than the `opengraph-image` file convention, because
 * that convention takes no language: a file-based image beats every page's
 * own `openGraph.images`, so the Spanish landing page could never preview in
 * Spanish. Both images are rendered once, at build time.
 */

const LANGS = ["en", "es"] as const satisfies readonly Lang[];

export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ image: `${lang}.png` }));
}

const INK = "#0b1b2b";
const MUTED = "#5b6b7a";
const PAPER = "#f3f9f7";
const TEAL_700 = "#00695c";
const TEAL_600 = "#00796b";
const TEAL_400 = "#1fd1b2";
const BLUE_600 = "#1a6be0";
const LINE = "#d5eae4";

const SLOTS = ["09:00", "09:30", "10:00", "10:30"];
const HELD_SLOT = "10:00";

/** Room left of the booking card for the headline, in pixels. */
const HEADLINE_WIDTH = 640;

/**
 * Sized to the longest line, so "Sin reservas duplicadas." stays on one line
 * where "No double bookings." can be set larger.
 */
function headlineSize(lines: readonly string[]) {
  const longest = Math.max(...lines.map((line) => line.length));
  return Math.min(76, Math.floor(HEADLINE_WIDTH / (longest * 0.54)));
}

async function loadFont(file: string) {
  return readFile(join(process.cwd(), "assets/fonts", file));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ image: string }> },
) {
  const { image } = await context.params;
  const lang: Lang = image === "es.png" ? "es" : "en";
  const t = translations[lang];
  const preview = t.heroPreview;
  const lines = t.hero.titleLines;
  const fontSize = headlineSize(lines);
  const host = new URL(getSiteOrigin()).host;
  const [display, body] = await Promise.all([
    loadFont("BricolageGrotesque-Bold.ttf"),
    loadFont("Figtree-Medium.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: PAPER,
          fontFamily: "Figtree",
          color: INK,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -220,
            width: 760,
            height: 760,
            borderRadius: 9999,
            // Opaque stops fading into the paper colour: Satori draws
            // transparent radial stops with a black centre.
            backgroundImage: `radial-gradient(circle, #c3eee4 0%, ${PAPER} 50%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -320,
            left: 260,
            width: 640,
            height: 640,
            borderRadius: 9999,
            backgroundImage: `radial-gradient(circle, #e1ebf8 0%, ${PAPER} 50%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexGrow: 1,
            padding: "60px 0 56px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: BLUE_600,
                color: "white",
                fontFamily: "Bricolage Grotesque",
                fontSize: 36,
              }}
            >
              H
              <div
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  backgroundColor: TEAL_400,
                  border: `4px solid ${PAPER}`,
                }}
              />
            </div>
            <div
              style={{
                marginLeft: 18,
                fontFamily: "Bricolage Grotesque",
                fontSize: 34,
                letterSpacing: -0.7,
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 27, color: TEAL_700, marginBottom: 18 }}>
              {t.hero.kicker}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Bricolage Grotesque",
                fontSize,
                lineHeight: 1.04,
                letterSpacing: -fontSize * 0.035,
              }}
            >
              {lines.map((line, index) => (
                <div
                  key={line}
                  style={{ color: index === lines.length - 1 ? TEAL_600 : INK }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 22, color: MUTED }}>{host}</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 64px 0 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 360,
              padding: 28,
              borderRadius: 28,
              backgroundColor: "white",
              border: `1px solid ${LINE}`,
              boxShadow: "0 24px 60px rgba(0,105,92,0.16)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontFamily: "Bricolage Grotesque",
                  fontSize: 24,
                  letterSpacing: -0.5,
                }}
              >
                Dr. Maya Rivera
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  marginLeft: 12,
                  padding: "5px 11px",
                  borderRadius: 9999,
                  backgroundColor: "#e0f5f0",
                  color: TEAL_600,
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    marginRight: 7,
                    borderRadius: 9999,
                    backgroundColor: TEAL_600,
                  }}
                />
                {preview.liveBadge}
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 17, color: MUTED }}>
              {preview.providerMeta}
            </div>

            <div style={{ marginTop: 22, fontSize: 16, color: MUTED }}>
              {/* "3 · Pick a time" is step three of the live preview; alone
                  on the card the number means nothing. */}
              {preview.stepTime.replace(/^\d+\s*·\s*/, "")}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              {SLOTS.map((slot) => {
                const held = slot === HELD_SLOT;
                return (
                  <div
                    key={slot}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 146,
                      height: 50,
                      marginBottom: 12,
                      borderRadius: 14,
                      fontSize: 19,
                      border: `2px solid ${held ? TEAL_700 : LINE}`,
                      backgroundColor: held ? TEAL_700 : "white",
                      color: held ? "white" : INK,
                    }}
                  >
                    {formatTimeLabel(slot, lang)}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 2,
                padding: "14px 18px",
                borderRadius: 16,
                backgroundColor: "#e9f7f3",
              }}
            >
              <div style={{ fontSize: 18 }}>{preview.holdLabel}</div>
              <div
                style={{
                  fontFamily: "Bricolage Grotesque",
                  fontSize: 26,
                  color: TEAL_700,
                }}
              >
                9:58
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 16,
                fontSize: 16,
                color: MUTED,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  marginRight: 9,
                  borderRadius: 9999,
                  backgroundColor: TEAL_400,
                }}
              />
              {preview.noAccountNote}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...SOCIAL_CARD_SIZE,
      fonts: [
        { name: "Bricolage Grotesque", data: display, weight: 700, style: "normal" },
        { name: "Figtree", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
