# Get started

ArchiveTuna surveys old folders and helps you find work worth revisiting.
Start with an inventory, then add a local model when you want descriptions
and a ranked review queue.

## Requirements

- Node.js 22 or newer.
- Ollama with a downloaded model for description, ranking, and optional STL vision.
- f3d and ImageMagick only when rendering STL previews.

Inventory, duplicate analysis, saved-report rebuilding, and facts-only STL
metadata work without a model. ArchiveTuna is developed on Windows; core
inventory uses portable Node APIs. Linux/macOS behavior needs platform testing.

## Published package

Once the 0.2.0 release is published:

```sh
npm install -g archivetuna
archivetuna --version
archivetuna --help
```

If npm still contains a name-reservation package, use the source checkout.

## Source install

```sh
git clone https://github.com/Catalyst-Forge-LLC/archivetuna.git
cd archivetuna
pnpm install
pnpm build
node dist/cli.js --help
```

In an existing local checkout, begin with pnpm install. The original checkout
directory may still be named sifter. Replace archivetuna with node dist/cli.js
in commands below when running from source.

## First inventory

Choose a small representative archive first. Keep outputs outside the source
tree, or use the default output directory (which the scanner excludes).

```sh
archivetuna scan "/path/to/archive" --out ./review
archivetuna dupes --out ./review
```

Read review/dupes.md. These are metadata comparisons; no file contents were
read and no originals were moved or deleted.

## First ranked report

```sh
archivetuna init profile.yaml
```

Edit the profile to describe what matters to you. Then download a model that
fits your hardware and start the local Ollama service:

```sh
ollama pull gemma4:12b
archivetuna doctor
archivetuna run "/path/to/archive" --profile profile.yaml --out ./review --limit 20 --dry-run
archivetuna run "/path/to/archive" --profile profile.yaml --out ./review --limit 20
```

The default model is gemma4:12b. Select another downloaded model with --model.
Read review/report.md and review/novel.md. Try a focused profile before spending
time on a much larger tree.

Continue with [the archive workflow](workflow.md) or [write a profile](profiles.md).
