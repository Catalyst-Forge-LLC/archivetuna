# ArchiveTuna release contract

Status: archivetuna@0.2.0 is published; https://archivetuna.dev and all guide routes were verified live on 2026-10-17. Git pushes and npm publication remain operator-owned.
The checkout is now at Z:/workspace/archivetuna. Its public product/package name is ArchiveTuna/archivetuna.

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

The registry 0.2.0 release was installed and exercised in a fresh consumer directory.
README changes after publication require a new npm release; shipping the site does
not update the README embedded in the existing tarball.

## Git

Public repository: https://github.com/Catalyst-Forge-LLC/archivetuna
Origin: https://github.com/Catalyst-Forge-LLC/archivetuna.git
Local release branch: main. The previous master branch was renamed to match
the intended production branch; the existing backup remote is preserved.

On 2026-10-17, the repository was verified public and empty. Public links are
restored. The operator handles the initial source push from the repository root:

```sh
git push -u origin main
```

## FilePress

- Site directory: site/
- Engine: pinned getfilepress 0.1.50
- Shared guide source: docs/guide/
- Generated docs mount: site/docs/dist -> /docs
- Build: pnpm site:build
- Output directory: site/build
- Confirmed intended Cloudflare Pages project: archivetuna
- Production branch: main
- Live domain: https://archivetuna.dev
- Live Pages URL: https://archivetuna.pages.dev
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

For each release, run read-only status and a Publish plan for the enrolled id. Verify
name archivetuna, directory Z:/workspace/archivetuna, root package.json as version
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
