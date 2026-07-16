# 12twenty Import Fixer

Fixes invalid picklist values in a 12twenty bulk-upload CSV so the file imports
without "Picklist option 'X' does not exist" errors. Everything runs in your
browser — your data never leaves your computer, there's no upload step and no
backend.

Next.js app: CSV parsing runs off the main thread (PapaParse workers), the
fuzzy-matching analysis runs in a dedicated Web Worker, and long value-review
lists are virtualized, so it stays responsive on large outcomes files and
picklists.

## Running it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

## How to use

1. **Picklist option files** — load one CSV per field, e.g.
   `Consolidated_Industry.csv`. The FIRST column of each file is treated as
   the list of valid options (extra columns are ignored, but you can switch
   the source column with the small dropdown if needed). Select several files
   at once, and add more later as you export them from 12twenty.

2. **Outcomes data file** — load your full import file (e.g. `cleaned.csv`).
   All headers and untouched columns are preserved exactly on export.

3. Click **Attach picklists to data columns**. Known 12twenty pairings are
   applied automatically (Consolidated Industry -> Industry, School ->
   University, Area of Study -> Expected Field of Study, Year -> "When do you
   expect to begin your graduate program?", State or Province -> US State /
   Canada Province, plus City, Country, Knowledge Source, Service Duration ->
   Fellowship Duration). You can change any attachment manually.

4. **Review** each column. For every distinct value the tool shows:
   - exact matches (auto-accepted, case/punctuation-insensitive)
   - blanks and N/A-style values (auto-blanked)
   - spelling-based fuzzy suggestions with a confidence percentage (>= 85%
     pre-accepted)
   - unresolved values -> click a suggestion, pick from the dropdown,
     "leave blank", or "keep as-is". One decision fixes every row with
     that value.

   Optionally, click **Enable smarter matching** to turn on meaning-based
   suggestions (e.g. "Nursing" -> "Healthcare") powered by a small AI model
   that runs entirely in your browser (see "Semantic matching" below). It's
   off by default and never sends any of your data anywhere.

5. **Save mappings** exports your decisions as JSON keyed by column name —
   load it next semester to reuse every decision instantly. Mapping files
   saved by earlier versions of this tool still load correctly.

6. **Export import-ready CSV** — writes `12twenty_import_ready.csv` with the
   original headers untouched and only the fixed values changed.

## Semantic matching (optional)

The default suggestions are pure spelling similarity, so a value like
"Nursing" won't match "Healthcare" — they don't share any letters in
sequence, even though they're related in meaning. Turning on **Enable
smarter matching** downloads a small open-source embedding model
([`Xenova/all-MiniLM-L6-v2`](https://huggingface.co/Xenova/all-MiniLM-L6-v2),
quantized, ~23MB) that runs entirely client-side (WASM/WebGPU via
[`@huggingface/transformers`](https://huggingface.co/docs/transformers.js))
and adds meaning-based suggestions to the list, tagged **meaning** and shown
with their own confidence score.

- **Off by default.** Nothing is downloaded and no network requests are made
  until you click the button — the app's default behavior is unchanged.
- The download happens once and is cached by the browser; it works offline
  after that. No data you've loaded is ever sent anywhere — only the model
  file itself is fetched, the same way a font or a JS library would be.
- Meaning-based suggestions **never auto-accept**, no matter how high the
  score — they always require a manual click. Only spelling-based matches
  keep today's >= 85% auto-accept behavior.

## Notes

- Two error types can't be fixed by data cleaning: "Could not determine the
  job status" (an admin/site setting) and "Student with specified email or
  12twenty ID was not found" (student missing from the system).

## Project layout

- `src/lib/` — pure matching/analysis/CSV logic (no React, no DOM), shared by
  the main thread and the workers.
- `src/workers/analysis.worker.ts` — runs the spelling-based fuzzy-matching
  analysis off the main thread; always on.
- `src/workers/embeddings.worker.ts` — loads the optional embedding model and
  computes meaning-based suggestions; only spun up once the user opts in.
- `src/store/useAppStore.ts` — Zustand store; owns picklists, the loaded
  outcomes file, column attachments, per-value decisions, and semantic
  matching state.
- `src/components/` — UI, including the virtualized column review list
  (`react-window`) and the semantic matching toggle.
