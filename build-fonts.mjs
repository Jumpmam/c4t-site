// Local-only build script (not run on Vercel, see vercel.json buildCommand override).
// Copies webfonts used in production into assets/fonts (woff2, served live),
// and instances/flattens static .ttf copies into .build-fonts/ for resvg-js,
// which cannot resolve family names or variable-axis glyphs from woff2 metadata.
import { copyFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const ASSETS = "./assets/fonts";
const BUILD = "./.build-fonts";
mkdirSync(ASSETS, { recursive: true });
mkdirSync(BUILD, { recursive: true });

const woff2 = [
  ["node_modules/@fontsource-variable/martian-mono/files/martian-mono-latin-wght-normal.woff2", "martian-mono-variable.woff2"],
  ["node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", "ibm-plex-mono-400.woff2"],
  ["node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2", "ibm-plex-mono-700.woff2"],
];

for (const [src, dest] of woff2) {
  copyFileSync(src, `${ASSETS}/${dest}`);
  console.log("copied", dest);
}

// og-image needs static ttf. Martian Mono is variable (wght axis only) -
// instance it at fixed weights so resvg gets real static glyphs, not defaults.
execSync(
  `python3 -c "
from fontTools import varLib
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib import TTFont
for wght, out in [(700, '${BUILD}/MartianMono-Bold.ttf'), (400, '${BUILD}/MartianMono-Regular.ttf')]:
    f = TTFont('node_modules/@fontsource-variable/martian-mono/files/martian-mono-latin-wght-normal.woff2')
    instantiateVariableFont(f, {'wght': wght}, inplace=True)
    f.flavor = None
    f.save(out)
"`,
  { stdio: "inherit" }
);
console.log("ttf built MartianMono-Bold.ttf / MartianMono-Regular.ttf");

for (const [src, dest] of [
  ["node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", "IBMPlexMono-Regular.ttf"],
  ["node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2", "IBMPlexMono-Bold.ttf"],
]) {
  const out = `${BUILD}/${dest}`;
  execSync(
    `python3 -c "from fontTools.ttLib import TTFont; f=TTFont('${src}'); f.flavor=None; f.save('${out}')"`,
    { stdio: "inherit" }
  );
  console.log("ttf built", dest);
}
