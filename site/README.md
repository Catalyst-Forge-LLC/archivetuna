# ArchiveTuna site

FilePress landing page and static documentation for ArchiveTuna.

```sh
pnpm --dir site install
pnpm site:dev
pnpm site:build
```

Edit the landing page in `pages/home.md` and the shared guides in
`../docs/guide/`. The docs builder generates `docs/dist/`, mounted at
`/docs` by FilePress. Generated output is ignored by Git.
The build checks every local link and documentation route.

`pnpm ship` builds and uploads to the intended Cloudflare Pages project
`archivetuna`, branch `main`. Verify the account and create the project
before the first upload. Domain registration and attachment are separate.

Keep the preview notice until the actual CLI release has been published.
See [the release contract](../docs/RELEASE.md) for the full procedure.
