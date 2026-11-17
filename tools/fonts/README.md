# Taichu UI Serif subset

Modified Noto Serif SC, static weight 600, internal family TaichuUISerifSubset.
Original font copyright: (c) 2017-2024 Adobe (http://www.adobe.com/).
The upstream OFL.txt additionally retains Copyright 2012 Google Inc. All Rights Reserved.
This subset remains licensed under SIL OFL 1.1; the complete unmodified OFL.txt accompanies it.
Changes: glyph subsetting, static wght=600 instantiation, internal family/style identifiers renamed.
Official source: https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl/notoserifsc
Reproduction, hashes and character coverage: tools/fonts/ in the project source.
No claim of Adobe/Google endorsement. Runtime Creator import/render acceptance is pending.

## Reproduce outside the repository

Requires Python and fontTools 4.61.1; no font installation.

    python tools/fonts/download.py --output-dir /path/to/official-cache
    python tools/fonts/build.py --source-dir /path/to/official-cache --output-dir /path/to/output

The downloader uses an immutable official Google Fonts commit; the builder verifies the source SHA256 before opening it. Do not commit the 24MB source font. The builder reads current GameApp.ts and core/**/*.ts, conservatively includes every printable character, all printable ASCII, common punctuation, plus the fixed review phrases. Missing codepoints fail before/after subsetting. It retains license and copyright name records, TrueType glyf/loca, and removes variation via instantiation (not extension renaming). No font/image conversion is hidden.

Review changed source hashes and output character manifest before copying outputs. New or remote text requires regenerating the subset; arbitrary player text must use a full fallback font. Preview samples are not game screenshots. Choose title/name/button use only; keep small numbers/body text in sans. Do not use synthetic bold over the 600 face.

The checked-in manifest describes the exact bundled candidate; rerunning against newer source may legitimately change it. Only the subset plus notices belongs in assets, not the full source or offline screenshots.

## Importer schema evidence

QA read the official Creator 3.8.8 installed template at Contents/Resources/resources/3d/engine/editor/assets/default_fonts/builtin-freetype/OpenSans-Regular.ttf.meta. It uses ver 1.0.1, importer ttf-font, imported true, files [.json, original TTF filename], empty subMetas/userData. This asset uses its own deterministic project UUID and its own filename, not the built-in UUID. Actual project import/render still requires QA.
