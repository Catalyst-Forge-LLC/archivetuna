# ArchiveTuna release contract

Status: 0.2.0 prepared locally; npm publication and domain registration are operator-owned.
The checkout remains at Z:/workspace/sifter. Its public product/package name is ArchiveTuna/archivetuna.

## npm

- Public package: archivetuna
- Publishable directory: repository root, not site/ or dist/
- Authoritative name/version: package.json
- README source: README.md
- License source: LICENSE (MIT)
- Executable: archivetuna -> dist/cli.js
- Build: pnpm build
- Tests: pnpm test
- Pack: npm pack (prepack builds TypeScript)
- Installation verification: npm run pack:smoke
- Operator release: npm publish <verified-tarball-path> --access public

The files allowlist includes dist/, profiles/starter.yaml, README.md, and LICENSE.
It excludes scratch images, the personal corpus profile, development source,
tests, and the private site package.

If the npm name is held by a reservation release, verify the registry version
before publishing 0.2.0. Do not overwrite or assume ownership from a name match.
After publication, inspect npm's name/version and packed README, then update the
site's preview notice only when the real package is available.

## Git

Intended repository (confirmed by operator): https://github.com/Catalyst-Forge-LLC/archivetuna
Production branch: main. Preserve the existing local backup remote.
The operator handles Git pushes. Confirm the public repository exists and add
its origin before the operator's first push. No GitHub repository is implied by
package metadata or a link.

## FilePress

- Site directory: site/
- Engine: pinned getfilepress 0.1.50
- Shared guide source: docs/guide/
- Generated docs mount: site/docs/dist -> /docs
- Build: pnpm site:build
- Output directory: site/build
- Confirmed intended Cloudflare Pages project: archivetuna
- Production branch: main
- Intended domain: https://archivetuna.dev
- Pages URL after provisioning: https://archivetuna.pages.dev
- Hosting account: verify the operator's authenticated account before provisioning/deploying
- Local deployment CLI: site/node_modules/.bin/wrangler
- Site Ship: pnpm --dir site ship
- Repository Ship: pnpm ship (delegates to the site)

Ship builds first, then uploads with an explicit project and branch. It does not
create the Pages project or register/attach a domain. Before the first Ship,
verify the account and project with the local Wrangler CLI. Domain purchase,
DNS, public repository availability, and npm publication are separate release
steps. Confirm the public docs routes and installation command after deployment.

## LocalHelm

Use the stable repository root as the npm release target. site/ is a private
development/site package and must never be the npm Publish target. No generated
release-target manifest is needed for this layout.

If enrolled, run read-only status and a Publish plan for the enrolled id. Verify
name archivetuna, directory Z:/workspace/sifter, root package.json as version
source, root README.md, prepack/build execution, and dist/cli.js. A quiet or
skipped row does not prove publication. Do not use --apply during preparation.

## Release acceptance

- Regression suite passes on synthetic archives and a mock local Ollama server.
- The packed archive installs in a fresh directory with working help/version,
  starter profile, scan, and standalone duplicate reports.
- FilePress builds / and every documented /docs route; links and mobile layout are reviewed.
- Record any real-model/rendering/platform checks not performed. Fixture tests
  do not establish model judgment quality or renderer compatibility.
- The operator reviews naming, publication targets, and the prepared artifact,
  then publishes npm and pushes Git as desired.
