# Release verification — 2026-10-17

ArchiveTuna 0.2.0 is prepared locally in the existing Sifter checkout.

## Verified

- CLI regression suite: 11 tests covering argument validation, safe dry-runs,
  evidence tiers, metadata candidates, cache identity, saved stages, local-model
  checks, and preservation of existing STL notes.
- npm pack/install smoke: 16 files, 20,192 bytes. The installed executable works
  through npm's bin resolution; help/version/init/scan/dupes pass in a fresh
  consumer directory. Packed README matches the repository README.
- Actual local Ollama (gemma4:12b): one synthetic Markdown project described and
  ranked at T2; reports generated successfully. Rebuilding saved reports passed
  with the same tier and limit. A changed limit was correctly rejected.
- Actual f3d and ImageMagick: a generated tetrahedron STL produced a five-view
  collage, visually inspected. Facts-only YAML metadata also succeeded.
- FilePress production build: 11 expected routes and 412 local links/assets pass.
  Desktop and 390px mobile landing/docs layouts inspected in the browser.
  Mobile guide expansion and navigation to the example report work.
- No horizontal page overflow observed on the mobile landing and example pages.

The verified npm artifact is copied to the ignored repository-root file
`archivetuna-0.2.0.tgz`. Publish that artifact rather than an unverified rebuild:

```sh
npm publish ./archivetuna-0.2.0.tgz --access public
```

This command is an operator step; it has not been run.

## Remaining release steps

1. Create the intended public GitHub repository and publish the source. The
   current checkout remains on master with its existing backup remote.
2. Publish the verified npm artifact. The registry currently contains the
   operator's archivetuna@0.0.0 name hold.
3. Verify the Cloudflare account and provision Pages project archivetuna, with
   main as its production branch. Then run the prepared Ship command.
4. Register/attach archivetuna.dev and check the public root and /docs routes.
5. Remove temporary preview/name-hold notices after the public release is verified.

ArchiveTuna is not currently enrolled in the workspace LocalHelm fleet.
No Git push, npm publication, Pages deployment, or domain change was made.

## Limits of these checks

The real-model smoke test validates integration with one local model on one
tiny synthetic archive; it is not a quality evaluation. STL vision inference,
large real archives, and Linux/macOS behavior have not been exercised.
FilePress emits upstream Vite/deprecation and pre-mount crawl warnings during
build; the completed static output and final link checks pass.
