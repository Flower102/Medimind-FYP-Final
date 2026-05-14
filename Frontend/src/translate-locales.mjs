// scripts/translate-locales.mjs
// I use this script to generate fr.json and es.json from en.json.
// I run it locally, commit the results, and then tweak important strings by hand.

import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, "src", "i18n", "locales");

const EN_PATH = path.join(LOCALES_DIR, "en.json");
const FR_PATH = path.join(LOCALES_DIR, "fr.json");
const ES_PATH = path.join(LOCALES_DIR, "es.json");

// I can swap this to any LibreTranslate-compatible endpoint later.
const TRANSLATE_URL = process.env.TRANSLATE_URL || "https://libretranslate.com/translate";

// Languages I want to generate.
const TARGETS = [
  { code: "fr", file: FR_PATH },
  { code: "es", file: ES_PATH }
];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function translateText(text, targetLang) {
  // I keep requests small and simple; if the endpoint rate-limits, I can rerun later.
  const res = await fetch(TRANSLATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "en",
      target: targetLang,
      format: "text"
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Translate failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.translatedText;
}

async function main() {
  const en = readJson(EN_PATH);

  for (const target of TARGETS) {
    const existing = readJson(target.file);
    const out = { ...existing };

    const keys = Object.keys(en);
    for (const key of keys) {
      // I skip any keys already translated, so I can run this script multiple times safely.
      if (out[key]) continue;

      const value = en[key];

      // I don’t translate empty values or non-strings.
      if (typeof value !== "string" || value.trim() === "") {
        out[key] = value;
        continue;
      }

      process.stdout.write(`Translating ${target.code}: ${key} ... `);

      try {
        const translated = await translateText(value, target.code);
        out[key] = translated;
        console.log("OK");
      } catch (e) {
        console.log("FAILED");
        console.error(e.message);
        // I keep the English text as fallback so the file stays complete.
        out[key] = value;
      }
    }

    writeJson(target.file, out);
    console.log(`\nSaved: ${target.file}`);
  }

  console.log("\nDone. Now I review fr.json / es.json and tweak any medical wording.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
