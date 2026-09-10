# Architecture Stencils Asset Directory

This directory contains standalone vector SVG stencils used by CanvasTube's Architecture Library.

## Directory Structure & Sources

```text
assets/icons/
├── aws/           # Amazon Web Services official architecture icons (33 SVGs)
├── gcp/           # Google Cloud Platform 2025 core & product icons (34 SVGs)
├── azure/         # Microsoft Azure Public Service Icons (30 SVGs)
├── kubernetes/    # CNCF / kubernetes/community official icons (23 SVGs)
└── generic/       # Common system design & architecture components (13 SVGs)
```

## Upstream Official Sources & Licenses

- **AWS**: [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (official 64px architecture release).
- **Google Cloud**: [Google Cloud Icons](https://cloud.google.com/icons) (CC-BY-4.0).
- **Azure**: [Azure Public Service Icons](https://learn.microsoft.com/en-us/azure/architecture/icons/) (official V24 release).
- **Kubernetes**: [kubernetes/community](https://github.com/kubernetes/community/tree/master/icons) (Apache-2.0 / CC-BY-4.0).

## Automated Sync Pipeline

To re-download or re-synchronize official upstream icons:

```bash
npm run sync:stencils
```

This runs [`scripts/sync-official-icons.mjs`](../../scripts/sync-official-icons.mjs), which:
1. Fetches and parses the official SVG assets.
2. Cleans XML prologues, Sodipodi/Inkscape metadata, and non-standard attributes.
3. Formats icons into responsive `viewBox="0 0 64 64"` vector assets.
4. Generates search metadata in [`src/core/icons/icon-metadata.ts`](../../src/core/icons/icon-metadata.ts).

## How to Add Custom Icons Manually

1. **Drop your `.svg` file** into the appropriate provider folder:
   - Example: `assets/icons/aws/custom-service.svg`

2. **Auto-Discovery**:
   - CanvasTube's [`icon-loader.ts`](../../src/core/icons/icon-loader.ts) automatically discovers all SVGs in this directory at compile/dev time using Vite's `import.meta.glob`.
   - The provider, category, and display name are automatically derived from the path and filename.

3. **Custom Search Tags**:
   - Add search synonyms or keyword tags to [`src/core/icons/icon-metadata.ts`](../../src/core/icons/icon-metadata.ts).

## SVG Formatting Guidelines

- Use `viewBox="0 0 64 64"` (or square proportions).
- Use self-contained inline SVG elements (`path`, `rect`, `circle`, etc.).
- Do not reference external URLs, external fonts, or external image links to preserve 100% offline isolation.
