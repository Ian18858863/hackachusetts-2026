# Requirements: Multilingual UI

> Status: DRAFT (T28s, owner Ian, written by Ian's Kiro on 2026-10-24 before any i18n code lands). Source: the coordinator request from Ian (15:36 ET) and the fixed T28 i18n API recorded in `design.md`. Nothing here goes beyond that request.
> Related: [`docs/CONTRACT.md`](../../../docs/CONTRACT.md) (unchanged by this feature), [`.kiro/steering/design.md`](../../steering/design.md) section 7 (medical safety framing).

## Introduction

The app and the landing page get a language switcher. English stays the default and must look exactly as it does today, because the judges and the recorded demo video are in English. The other languages are 简体中文 (zh), 日本語 (ja), Español (es), 한국어 (ko) and Français (fr). Only text the app itself authors is translated. Medical content from upstream services, the patient's notes and the licence lines stay as received, in English, with one translated note that says so.

## Glossary

- **Locale**: one of `en`, `zh`, `ja`, `es`, `ko`, `fr` (`LOCALES` in `app/src/shared/i18n/locales.ts`).
- **App-authored string**: UI text written by us in `app/**` or `landing/**` (headings, buttons, hints, empty, loading and error states, the safety sentence, labels for data fields).
- **Received text**: anything that comes from an `/api/*` response or from data: HPO labels, disease names, gene symbols, ids, trial titles and conditions, question sentences and "why" lines, brief text produced by the server, `error.message` from the server.
- **Licence lines**: the attribution strings required by contract section 13 (HPO, Monarch, Orphanet CC BY 4.0, ClinicalTrials.gov, phenopacket-store).
- **Safety sentence**: "Decision support, not a diagnosis. These are possible matches to discuss with a doctor." (contract section 13).
- **Message module**: one file per UI area under `app/src/shared/i18n/messages/<area>.ts`.

## Requirement I1: Default locale and zero visual change

**User story:** As a judge or a viewer of the recorded video, I want the English app to look exactly as before, so that the footage stays valid.

I1.1 WHEN no `?lang=` parameter is present and no stored choice exists THE SYSTEM SHALL use locale `en`.
I1.2 THE SYSTEM SHALL NOT pick the locale from `navigator.language` or any other browser setting.
I1.3 WHILE the locale is `en` THE SYSTEM SHALL render every string byte-identical to the English text on `main` before T28 (each English string is moved into the `en` dictionary unchanged).
I1.4 WHILE the locale is `en` THE SYSTEM SHALL NOT change layout, fonts, spacing or colours, apart from the language switcher control itself.

## Requirement I2: Choosing and keeping a locale

**User story:** As a user who reads another language better, I want to switch the language once and have it remembered.

I2.1 THE SYSTEM SHALL show a language switcher in the app top bar (`TopBar`) and in the landing page header.
I2.2 THE SYSTEM SHALL list each locale by its native name: English, 简体中文, 日本語, Español, 한국어, Français.
I2.3 WHEN the user picks a locale THE SYSTEM SHALL re-render all app-authored strings in that locale without a page reload and without losing the case object or the current step.
I2.4 WHEN the user picks a locale THE SYSTEM SHALL store it in `localStorage` under `rdd.lang.v1`; IF storage is unavailable or throws THEN THE SYSTEM SHALL keep the choice for the session and SHALL NOT show an error.
I2.5 WHEN the URL has `?lang=<value>` with a value of `en`, `zh`, `ja`, `es`, `ko`, `fr`, `zh-CN` or `zh-Hans` THE SYSTEM SHALL use that locale (`zh-CN` and `zh-Hans` map to `zh`) and store it as in I2.4.
I2.6 WHEN `?lang=` has any other value THE SYSTEM SHALL ignore it and fall back to the stored value, else `en`.
I2.7 WHEN the locale is set THE SYSTEM SHALL set `document.documentElement.lang` to the locale's `htmlLang` (`en`, `zh-Hans`, `ja`, `es`, `ko`, `fr`) and `data-locale` to the locale id.
I2.8 THE SYSTEM SHALL keep other query parameters (for example `?demo=demo-npc1`, `?mock=1`) working together with `?lang=`.
I2.9 THE app and the landing page SHALL share the stored key `rdd.lang.v1`, so a choice made on one applies to the other (same origin).

## Requirement I3: What is translated

**User story:** As a user, I want the whole interface in my language, so that I can follow every step.

I3.1 THE SYSTEM SHALL translate every app-authored string in the app shell, intake, review, ranking, questions, brief, trials and client-side error areas, including `aria-label`, `aria-live` announcements, placeholder, `title` and alt text.
I3.2 THE SYSTEM SHALL translate the safety sentence in every locale, faithfully: it SHALL keep both statements (this is decision support and not a diagnosis; these are possible matches to discuss with a doctor) and SHALL NOT soften, hedge or shorten either one.
I3.3 THE SYSTEM SHALL show the translated safety sentence wherever the English one appears today (every result screen and the brief), in body size.
I3.4 Translations SHALL use plain, careful medical wording, SHALL NOT add claims, and SHALL use the shared glossary in `messages/common.ts` (for example feature / 特征, possible match / 可能匹配, brief / 简报) consistently across areas.
I3.5 Chinese text SHALL be Simplified Chinese.
I3.6 Overlap labels and other values the app maps from codes (for example `strong` / `partial` / `weak`, term statuses, frequency band names shown as UI labels) SHALL be translated as UI labels; the raw code sent to or received from the API SHALL stay unchanged.

## Requirement I4: What stays as received

**User story:** As a clinician, I want medical terms and source data exactly as the sources publish them, so that nothing is lost or altered in translation.

I4.1 THE SYSTEM SHALL show received text unchanged in every locale: HPO labels, disease names, gene symbols, ids, trial titles and conditions, question sentences, "why" lines, brief text produced by the server and server `error.message` values.
I4.2 THE SYSTEM SHALL show the patient's notes and the demo narratives exactly as written, and the demo label ("Demo case (synthetic narrative from phenopacket-store <id>)") in English.
I4.3 THE SYSTEM SHALL show the licence lines of contract section 13 in English in every locale.
I4.4 WHILE the locale is not `en` THE SYSTEM SHALL show one translated note, near the results, that says medical terms, disease names and data from the sources are shown in English as published.
I4.5 THE SYSTEM SHALL NOT change any `/api/*` request, response, the case object or the phenopacket export because of the locale.

## Requirement I5: Typography and layout in every locale

**User story:** As a reader of Chinese, Japanese or Korean, I want the text to render with proper glyphs and fit the screen.

I5.1 WHILE the locale is `zh`, `ja` or `ko` THE SYSTEM SHALL use CJK font fallbacks appropriate to that language for both the text and display families; WHILE the locale is `en` the font stacks SHALL be unchanged.
I5.2 THE SYSTEM SHALL NOT download additional web fonts for CJK locales (system fonts only).
I5.3 THE SYSTEM SHALL show no horizontal page scroll and no clipped or overlapping text at 375×812 in `zh` and `ja`, and at 1440×900 and 1000×600 in every locale.
I5.4 THE language switcher SHALL be keyboard operable, labelled in the current locale, show a visible focus ring, and have a tap target of at least 44×44 px.

## Requirement I6: Correctness of the dictionaries

**User story:** As the team, we want missing or broken translations caught before deploy.

I6.1 THE SYSTEM SHALL define messages with typed dictionaries (`defineMessages`) so that a key missing from any non-English locale is a TypeScript compile error.
I6.2 THE SYSTEM SHALL NOT add an i18n library or any new dependency.
I6.3 **Correctness property (dictionary completeness).** For every message module M and every locale L: the key set of `M[L]` equals the key set of `M.en`; no value in `M[L]` is empty or whitespace-only; and the set of `{placeholder}` names in each value equals the set in the `en` value for the same key. Checked by `app/src/shared/i18n/messages.test.ts`.
I6.4 **Correctness property (safety keys).** The `common` module SHALL contain the safety-sentence key and the English-content note key, and their `en` values SHALL equal the contract section 13 safety sentence and the agreed English note. Checked by the same test.
I6.5 THE test SHALL run with `npm --prefix app run test:i18n` (`node --test --experimental-strip-types`), with no new dependency.
I6.6 `format(template, vars)` SHALL replace every `{name}` placeholder that has a value in `vars` and SHALL leave the text otherwise unchanged.

## Requirement I7: No regression

I7.1 THE SYSTEM SHALL pass `node scripts/smoke.mjs <base>` with the same results as before T28.
I7.2 THE app build (`npm --prefix app run build`, which type-checks) and the landing build SHALL pass.
I7.3 THE SYSTEM SHALL NOT change `functions/**`, `engine/**` or `docs/CONTRACT.md` for this feature.
