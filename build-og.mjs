// Local-only build script: rasterizes og.png and favicon.png with resvg-js.
// Not run on Vercel (no build step there, see vercel.json) - output is
// committed as a static asset.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const BG = "#0a0b09";
const PANEL = "#15170f";
const LINE = "#33362a";
const GREEN = "#7bc06d";
const GREEN_DIM = "#587a4f";
const RED = "#d9503f";
const OFFWHITE = "#e7e3d4";
const YELLOW = "#c7a232";

const catB64 = readFileSync("./assets/c4t-cutout.png").toString("base64");
// source cutout is 362x515
const catH = 520;
const catW = Math.round(catH * (362 / 515));

const displayFont = readFileSync(".build-fonts/MartianMono-Bold.ttf");
const bodyFont = readFileSync(".build-fonts/IBMPlexMono-Regular.ttf");
const bodyFontBold = readFileSync(".build-fonts/IBMPlexMono-Bold.ttf");

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${BG}"/>

  <rect x="28" y="28" width="1144" height="574" rx="6" fill="none" stroke="${LINE}" stroke-width="2"/>

  <rect x="0" y="0" width="1200" height="630" fill="none"/>
  <g opacity="0.5">
    <line x1="28" y1="60" x2="1172" y2="60" stroke="${LINE}" stroke-width="1"/>
  </g>

  <text x="60" y="52" font-family="IBM Plex Mono" font-size="15" letter-spacing="3" fill="${GREEN_DIM}">C4T // DEVICE ONLINE</text>

  <rect x="700" y="100" width="440" height="500" rx="4" fill="${PANEL}" stroke="${LINE}" stroke-width="2"/>
  <image href="data:image/png;base64,${catB64}" x="${920 - catW / 2}" y="130" width="${catW}" height="${catH}"/>

  <text x="60" y="200" font-family="Martian Mono SemiExpanded" font-weight="700" font-size="118" fill="${OFFWHITE}">C4T</text>
  <text x="64" y="248" font-family="IBM Plex Mono" font-weight="700" font-size="26" letter-spacing="4" fill="${YELLOW}">$C4T</text>

  <text x="64" y="330" font-family="IBM Plex Mono" font-size="16" letter-spacing="2" fill="${GREEN_DIM}">STATUS</text>
  <text x="164" y="330" font-family="IBM Plex Mono" font-weight="700" font-size="16" letter-spacing="2" fill="${GREEN}">C4T ARMED</text>

  <text x="64" y="410" font-family="Martian Mono SemiExpanded" font-weight="700" font-size="72" letter-spacing="2" fill="${OFFWHITE}">00:04:20</text>

  <text x="64" y="452" font-family="IBM Plex Mono" font-size="18" fill="${GREEN_DIM}">this c4t will blow up</text>

  <rect x="64" y="500" width="230" height="56" rx="3" fill="${RED}" stroke="#6e211b" stroke-width="2"/>
  <text x="179" y="536" font-family="Martian Mono SemiExpanded" font-weight="700" font-size="19" letter-spacing="1.5" fill="${OFFWHITE}" text-anchor="middle">DO NOT PRESS</text>
</svg>`;

const resvg = new Resvg(svg, {
  font: {
    fontBuffers: [displayFont, bodyFont, bodyFontBold],
    loadSystemFonts: false,
    defaultFontFamily: "IBM Plex Mono",
  },
});
const png = resvg.render().asPng();
writeFileSync("./assets/og.png", png);
console.log("og.png built", png.length, "bytes");

// favicon: dark square, faded green C4T wordmark
const favSvg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="28" fill="${BG}"/>
  <rect x="10" y="10" width="236" height="236" rx="22" fill="none" stroke="${LINE}" stroke-width="4"/>
  <text x="128" y="150" font-family="Martian Mono SemiExpanded" font-weight="700" font-size="88" fill="${GREEN}" text-anchor="middle">C4T</text>
  <circle cx="128" cy="196" r="7" fill="${RED}"/>
</svg>`;
const favResvg = new Resvg(favSvg, {
  font: {
    fontBuffers: [displayFont],
    loadSystemFonts: false,
    defaultFontFamily: "Martian Mono SemiExpanded",
  },
});
writeFileSync("./assets/favicon.png", favResvg.render().asPng());
console.log("wrote assets/favicon.png");
