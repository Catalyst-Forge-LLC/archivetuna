# Published release review — 2026-10-17

ArchiveTuna 0.2.0 is available from npm, and archivetuna.dev is live.
This review supersedes the remaining-release checklist in VERIFICATION.md,
which records the earlier pre-publication checks.

## Findings and changes

- The live homepage, getting-started guide, and packaged README still described
  npm as a name reservation. Updated the source to describe the published CLI,
  added the install command to the landing page, and removed the obsolete
  source-checkout prerequisite.
- The intended public GitHub repository initially returned HTTP 404. After the
  operator supplied the repository, it was verified public and empty on
  2026-10-17. Origin is configured, the local branch is main, and public links
  are restored. The operator still needs to push the source. Existing npm
  repository metadata already points to this correct URL.
- Relative README links pointed into guide files excluded from the npm tarball.
  They now point to the working public documentation routes.
- Added the ArchiveTuna illustration to the site, guide, and README, and added
  the product beside MediaTuna on the Catalyst Forge shelf. BRAND.md records
  the reference, asset locations, and generation prompt.

## Checks

- Registry: archivetuna@0.2.0, executable dist/cli.js, Node.js >=22, 16 packed files.
- Fresh registry install with lifecycle scripts disabled: CLI help/version,
  npm bin resolution, starter profile, scan, duplicate report, and analysis
  dry-run passed on Windows / Node.js 25.1.0. A synthetic matching folder pair
  was correctly reported as metadata candidates. Dry-run created no outputs,
  and original fixture contents were unchanged.
- Live HTTP: homepage, /docs, and all nine guide routes returned 200, with the
  expected page titles. Homepage linked CSS/favicon/logo assets returned 200.
- Updated FilePress build: 11 routes and 412 local links/assets passed.
- Updated local npm pack/install: 16 files, 20,195 bytes; installed README
  matches source; bin/help/version/init/scan/dupes passed. This is a verification
  artifact at the existing version, not a replacement for the published tarball.
- Browser: updated landing page and guide inspected at desktop and 390px;
  mobile guide expansion and example-report navigation work, without page overflow.
- Catalyst Forge: production build, draft-exclusion check, and Svelte check pass.
  Product-facts validation passes for all 29 tools. Fifteen existing warnings
  concern other tools' versions or blog dates; none concern ArchiveTuna.
  Svelte check also logged an Atlas config-cache permission warning before
  reporting zero diagnostics for the main workspace.
- Shelf: ArchiveTuna resolves by hash, appears in Capture and preserve work,
  sits beside MediaTuna, and renders its logo at desktop and 390px widths.

## Publication handoff

Ship ArchiveTuna to publish the release-copy fixes and /logo.png. Ship Catalyst
Forge to publish the shelf entry and regenerated Markdown, JSON, and RSS feeds.
The updated npm README needs a new version and publication through the normal
release workflow; the already-published 0.2.0 tarball is unchanged. Ship the site
before publishing that README so its logo URL is available. Git pushes remain
operator-owned.

This pass did not repeat real-model or STL-rendering checks, assess ranking
quality, or test Linux/macOS. See VERIFICATION.md for the earlier model and
renderer integration checks. No new npm release, Git push, or deployment was
performed during this review.
