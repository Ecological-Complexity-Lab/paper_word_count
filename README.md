# LaTeX Word Counter

A browser-based word counter for LaTeX manuscripts, built by the [Ecological Complexity Lab](https://ecomplab.com).

**Live app → [Ecological-Complexity-Lab.github.io/paper_word_count](https://Ecological-Complexity-Lab.github.io/paper_word_count/)**

All processing happens locally in your browser — your files are never uploaded anywhere.

---

## Features

- **Section-level counts** — select exactly which sections contribute to the total (IMRAD sections are pre-selected automatically)
- **Abstract & special sections** highlighted separately (Author Summary, Significance Statement, etc. are detected automatically)
- **Captions and math** can be included or excluded via options
- **Word limit tracker** with a colour-coded progress bar
- **Compare mode** — load two versions of a manuscript and see a side-by-side diff by section
- Handles `\input{}` / `\include{}` — multi-file projects work out of the box
- Ignores the preamble, `\maketitle` block, bibliography, and supplementary material

---

## How to use

### Single file

1. Click the upload area (or drag and drop) and select one or more `.tex` files.
2. If you have a multi-file project, upload all the files at once — the tool will auto-detect the main file (the one with `\documentclass`).
3. Use the **section tree** on the left to tick/untick which sections count toward the total.
4. Adjust **Options** (include math, include captions, word limit) as needed.

### Compare two manuscripts

1. Upload both `.tex` files.
2. One file is automatically set as the **main file** (indigo pill).
3. **⌘ / Ctrl + click** the second file's pill to set it as the **compare file** (amber pill). Compare mode activates immediately.
4. The compare dashboard shows:
   - Total word counts for each file side by side
   - Abstract, special sections, and captions as dual cards with a diff
   - A section-by-section table — sections matched by title, with colour-coded diffs (blue = more in B, orange = more in A)
   - Sections present in only one file are listed separately at the bottom
   - Document element counts (equations, figures, tables, citations) for both files
5. To exit compare mode, **⌘ / Ctrl + click** the amber file again to deselect it.

---

## What is counted

| Included by default | Excluded by default | Never counted |
|---|---|---|
| Abstract | Math environments | Preamble |
| Body sections (IMRAD auto-selected) | Figure/table captions | `\maketitle` block (title, authors, affiliations) |
| Special pre-body sections | | Bibliography / references |
| | | Supplementary material |

---

## Local development

```bash
npm install
npm run dev
```

Requires Node.js ≥ 18. Built with [React](https://react.dev) + [Vite](https://vitejs.dev) + [Tailwind CSS](https://tailwindcss.com).

---

## Credits

Developed by the [Ecological Complexity Lab](https://ecomplab.com), Ben-Gurion University of the Negev.
