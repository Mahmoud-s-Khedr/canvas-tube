# Architecture Stencils Asset Directory

This directory contains standalone vector SVG stencils used by CanvasTube's Architecture Library.

## Directory Structure & Sources

```text
assets/icons/
├── aws/           # Amazon Web Services official architecture icons (33 SVGs)
├── gcp/           # Google Cloud Platform 2025 core & product icons (34 SVGs)
├── azure/         # Microsoft Azure Public Service Icons (30 SVGs)
├── kubernetes/    # CNCF / kubernetes/community official icons (23 SVGs)
└── generic/       # Architecture primitives plus 28 pinned technology logos
```

## Upstream Official Sources & Licenses

- **AWS**: [AWS Architecture Icons](https://aws.amazon.com/architecture/icons/) (official 64px architecture release).
- **Google Cloud**: [Google Cloud Icons](https://cloud.google.com/icons) (CC-BY-4.0).
- **Azure**: [Azure Public Service Icons](https://learn.microsoft.com/en-us/azure/architecture/icons/) (official V24 release).
- **Kubernetes**: [kubernetes/community](https://github.com/kubernetes/community/tree/master/icons) (Apache-2.0 / CC-BY-4.0).
- **Technology logos**: [Simple Icons](https://simpleicons.org/) package v16 (CC0-1.0). Individual trademarks remain the property of their owners.

## Automated Sync Pipeline

To synchronize the curated Kubernetes pack and generic technology logos:

```bash
npm run sync:stencils
```

This runs [`scripts/sync-official-icons.mjs`](../../scripts/sync-official-icons.mjs), which:
1. Refreshes the selected icons from `kubernetes/community`.
2. Copies the pinned, local `simple-icons` package into the generic set.
3. Cleans Kubernetes editor metadata while preserving each SVG's native viewBox.

The command intentionally does **not** overwrite [`src/core/icons/icon-metadata.ts`](../../src/core/icons/icon-metadata.ts). Add the metadata entry together with any manually added icon.

## How to Add Custom Icons Manually

1. **Drop your `.svg` file** into the appropriate provider folder:
   - Example: `assets/icons/aws/custom-service.svg`

2. **Auto-Discovery**:
   - CanvasTube's [`icon-loader.ts`](../../src/core/icons/icon-loader.ts) automatically discovers all SVGs in this directory at compile/dev time using Vite's `import.meta.glob`.
   - The provider, category, and display name are automatically derived from the path and filename.

3. **Custom Search Tags**:
   - Add search synonyms or keyword tags to [`src/core/icons/icon-metadata.ts`](../../src/core/icons/icon-metadata.ts).

## SVG Formatting Guidelines

- Use a valid `viewBox`; square proportions are preferred for architecture primitives.
- Use self-contained inline SVG elements (`path`, `rect`, `circle`, etc.).
- Do not reference external URLs, external fonts, or external image links to preserve 100% offline isolation.
