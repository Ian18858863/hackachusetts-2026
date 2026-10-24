# Design: Multilingual UI

> Status: DRAFT (T28s, owner Ian, written by Ian's Kiro on 2026-10-24 before any i18n code lands). Requirement ids (`I<n>.<m>`) refer to `requirements.md`. The API in section 2 is fixed for every T28 task.

## 1. Overview

A small typed dictionary layer in `app/src/shared/i18n/`, with no library. Each UI area has one message module holding the English text (moved unchanged from today's components) and the five translations. A React provider holds the current locale; components read strings through `useT(messages)`. The landing page has its own small copy of the same pattern under `landing/src/i18n/`. Nothing on the server side changes.

## 2. API (fixed)

### `app/src/shared/i18n/locales.ts`

```ts
export const LOCALES = ['en', 'zh', 'ja', 'es', 'ko', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_META: Record<Locale, { htmlLang: string; nativeName: string }> = {
  en: { htmlLang: 'en', nativeName: 'English' },
  zh: { htmlLang: 'zh-Hans', nativeName: '简体中文' },
  ja: { htmlLang: 'ja', nativeName: '日本語' },
  es: { htmlLang: 'es', nativeName: 'Español' },
  ko: { htmlLang: 'ko', nativeName: '한국어' },
  fr: { htmlLang: 'fr', nativeName: 'Français' },
};
```

### `app/src/shared/i18n/define.ts`

- `defineMessages(en, others)`, where `others: Record<Exclude<Locale, 'en'>, { [K in keyof typeof en]: string }>`. A missing key in any locale is a compile error (I6.1). Extra keys are also rejected by the mapped type in object literals.
- `format(template, vars)` replaces `{name}` placeholders from `vars` (I6.6). Plurals are handled by separate keys chosen in code (for example `featureCountOne` / `featureCountOther`), not by a plural engine.

### `app/src/shared/i18n/I18nProvider.tsx`

- `<I18nProvider>` wraps the app in `main.tsx`.
- `useLocale(): { locale, setLocale }`.
- `useT(messages)` returns `t(key, vars?) => string`, typed to the module's keys.

### Initial locale and persistence

1. `?lang=` if it is one of `en`, `zh`, `ja`, `es`, `ko`, `fr`, or `zh-CN` / `zh-Hans` (mapped to `zh`). The value is then stored (I2.5).
2. Else the value stored in `localStorage` under `rdd.lang.v1`, if valid.
3. Else `en` (I1.1). `navigator.language` is never read (I1.2).

`setLocale` stores the value inside `try/catch` and never throws (I2.4), then sets `document.documentElement.lang = LOCALE_META[locale].htmlLang` and `document.documentElement.dataset.locale = locale` (I2.7). The provider applies the initial locale the same way on mount. Reading `?lang=` does not rewrite the URL, so `?demo=` and `?mock=` keep working (I2.8).

### Message modules

One file per area: `app/src/shared/i18n/messages/<area>.ts` with
`export default defineMessages({ ...en }, { zh: {...}, ja: {...}, es: {...}, ko: {...}, fr: {...} })`.

| Area | Task | Holds |
|---|---|---|
| `common` | T28a | Safety sentence, the English-content note, glossary terms, shared buttons and states |
| `shell` | T28a | Top bar, step navigation, step headers, footer labels, language switcher label |
| `intake` | T28b | Notes input, character count, demo picker, intake errors |
| `review` | T28b | Term groups, status controls, undo, manual add, warnings heading |
| `ranking` | T28c | Candidate list, overlap labels, evidence panel headings, "raw service score", stale and updating states |
| `questions` | T28c | Question list chrome, yes / no answers |
| `brief` | T28d | Brief view chrome, print and download buttons |
| `trials` | T28d | Trials list chrome, empty state |
| `api` | T28d | Client-side error, offline and network states authored by the app |

`common.ts` starts with a glossary comment that fixes the preferred term per locale for: feature, possible match, brief, overlap (strong / partial / weak), not present, what to check next, recruiting study, demo case. Later areas reuse those words (I3.4).

Required keys in `common` (I6.4): `disclaimer` (the safety sentence) and `englishContentNote` (the note of I4.4). T28a fixes the English note text; it states that medical terms, disease names and source data are shown in English as published.

### Landing

`landing/src/i18n/` holds a small copy of `locales.ts`, `define.ts` and one message module for the landing copy (T28e). It reads and writes the same `rdd.lang.v1` key and the same `?lang=` rule, so a choice carries between `/` and `/app/` (I2.9). The landing calls to action keep pointing at `/app/?demo=demo-npc1`; the stored choice carries the locale.

## 3. Data flow

```text
URL ?lang=  ──┐
localStorage ─┼─> I18nProvider (locale) ──> <html lang, data-locale>
'en' default ─┘          │
                         ├─> useT(messages/<area>) ──> app-authored strings
                         └─> LanguageSwitcher (TopBar) ──> setLocale ──> localStorage

/api/* responses ──────────────────────────> rendered as received (no translation)
case object (localStorage rdd.case.v0.1) ──> unchanged by locale
```

## 4. What is translated and what is not

| Content | Translated? | Why |
|---|---|---|
| Headings, buttons, hints, empty / loading / error states, `aria-*` text, alt text authored in `app/**` | Yes | App-authored UI (I3.1) |
| Safety sentence | Yes, faithfully, never weaker | Contract section 13 and design steering section 7; the user must understand it (I3.2) |
| Labels the app maps from codes (overlap, term status, frequency band shown as a label) | Yes, label only | The code stays the contract value (I3.6) |
| HPO labels, disease names, gene symbols, ids | No | HPO licence: do not alter content; names must match the sources a clinician checks (I4.1) |
| Trial titles and conditions | No | ClinicalTrials.gov data as published |
| Question sentences, "why" lines, server brief text, server `error.message` | No | Produced by `/api/*`; translating them would need a server change, which is out of scope (I4.5, I7.3) |
| Patient notes, demo narratives, demo label | No | The user's own words; the demo label is required wording (I4.2) |
| Licence lines (HPO, Monarch, Orphanet CC BY 4.0, ClinicalTrials.gov, phenopacket-store) | No | Required attribution wording (I4.3) |
| Phenopacket JSON | No | A standard data file for clinic tools (I4.5) |

The translated `englishContentNote` sits near the results in non-English locales (I4.4), so mixed-language screens are explained once instead of everywhere.

## 5. Font strategy

- English keeps `--f-display` (Newsreader) and `--f-text` (Source Sans 3) exactly as in `app/src/styles/tokens.css` (I1.4).
- CJK locales override the two tokens under `:root[data-locale='zh']`, `[data-locale='ja']` and `[data-locale='ko']`, keeping the Latin faces first (so ids and HPO labels look the same) and adding system CJK fallbacks after them:
  - zh text: PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC / Noto Sans CJK SC; display: Songti SC, Noto Serif SC / Noto Serif CJK SC, then the text stack.
  - ja text: Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, Noto Sans JP / Noto Sans CJK JP; display: Hiragino Mincho ProN, Yu Mincho, Noto Serif JP, then the text stack.
  - ko text: Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR / Noto Sans CJK KR; display: AppleMyungjo, Noto Serif KR, then the text stack.
- `lang` on `<html>` lets the browser pick the right Han glyph forms for zh versus ja.
- CJK locales get `line-break: strict` and `overflow-wrap: anywhere` on text containers that hold translated strings, so long runs without spaces wrap at 375 px (I5.3).
- No CJK web fonts are downloaded (I5.2): they are several MB each and would slow the first paint.

## 6. Testing

- **Compile time:** `defineMessages` types make a missing key a type error; `npm --prefix app run build` type-checks (I6.1, I7.2).
- **`app/src/shared/i18n/messages.test.ts`** (`node:test`, `node --test --experimental-strip-types`, script `test:i18n`, no new dependency): imports every file in `messages/` dynamically, and for every module × locale checks the same key set as `en`, no empty or whitespace-only value, and the same `{placeholder}` set as `en`; checks that `common` has `disclaimer` and `englishContentNote` and that `common.en.disclaimer` equals the contract section 13 sentence (I6.3, I6.4, I6.5). A small `format` test covers I6.6.
- **English zero-change check (T28f):** screenshots of every step at 1440×900 for `en` before and after T28, compared by eye and by a pixel diff where available; plus a check that the `en` dictionary strings equal the strings removed from the components (I1.3, I1.4).
- **Layout check (T28f):** screenshots at 375×812 in `zh` and `ja`, and at 1440×900 and 1000×600 in every locale; horizontal scroll checked with `document.documentElement.scrollWidth <= innerWidth` (I5.3).
- **Smoke:** `node scripts/smoke.mjs` on local and live, results compared with the pre-T28 run (I7.1).
- **Translation review:** rdd-reviewer reads every module for the glossary, faithfulness of the safety sentence and no added claims. Native-speaker review is not available in this session and is reported as NOT RUN.

## 7. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Server-produced English sentences (question sentences, "why" lines, brief text, error messages) appear inside a translated screen | Mixed language on the questions, brief and error views | Keep them as received (they come from data and must not be altered); show the translated `englishContentNote` once; translate the surrounding chrome |
| The server brief carries its own English `disclaimer` | The printed brief in a non-English locale shows the English safety sentence | Keep the server's English line and also show the translated `disclaimer` from `common` above it, so the safety text is never weaker or missing |
| Licence lines stay English | Footer is partly English in every locale | Required wording; keep it |
| A translation weakens the safety sentence or adds a medical claim | Safety rule broken | I3.2 criteria, `common` test for the English value, rdd-reviewer check of each locale |
| An English string changes while moving it into the dictionary | Recorded video no longer matches | Move strings unchanged; T28f English screenshot comparison |
| CJK text overflows at 375 px | Clipped buttons or horizontal scroll | Wrapping rules in section 5, T28f checks at 375×812 in zh and ja |
| Glossary drift across areas | Same concept named two ways | Glossary in `common.ts`, written first (T28a), reused by T28b–T28d |
| `localStorage` blocked (private mode, policies) | Choice not kept | try/catch; session-only choice; never throws (I2.4) |
| Machine-quality wording in some locale | Reads unnatural to native speakers | Short, plain UI strings; record in QA that no native-speaker review was done |
| Deploy target ~16:45 ET is tight before the 17:30 freeze | Partial rollout | Each area task ships independently; English stays the default, so an unfinished locale never affects the video |

## 8. Out of scope

- Translating any `/api/*` output, adding a locale parameter to the API, or changing `functions/**`, `engine/**` or `docs/CONTRACT.md`.
- Right-to-left locales, locale-specific number or date formatting, browser language detection.
- Translating the product name "Rare Disease Detective" (kept as the brand name; Ian may decide otherwise).
