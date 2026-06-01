# Publishing

This repository publishes two things:

- the static documentation and playground site through GitHub Pages
- the `prettier-plugin-salesforce` package through npm

## GitHub Repository

The package metadata points to:

- Repository: `https://github.com/mattsimonis/prettier-plugin-salesforce`
- Site: `https://mattsimonis.github.io/prettier-plugin-salesforce/`

Create and push the repository from the local root:

```sh
gh repo create mattsimonis/prettier-plugin-salesforce --public --source=. --remote=origin --push
```

If the repository already exists, add it as `origin` and push:

```sh
git remote add origin https://github.com/mattsimonis/prettier-plugin-salesforce.git
git push -u origin main
```

## GitHub Pages

The live Pages site is served from the `gh-pages` branch:

```sh
pnpm playground:build
git -C packages/playground/dist init
git -C packages/playground/dist add .
git -C packages/playground/dist commit -m "Deploy playground"
git -C packages/playground/dist push --force origin HEAD:gh-pages
rm -rf packages/playground/dist/.git
```

The repository Pages source should be:

- branch: `gh-pages`
- folder: `/`

The Pages workflow also lives at
[`.github/workflows/playground-pages.yml`](../.github/workflows/playground-pages.yml).
It builds `packages/playground/dist` with `pnpm playground:build` and deploys
that folder with the GitHub Pages Actions deployer. It should stay disabled
while GitHub Actions jobs cannot start for the account. Enable it after Actions
can run again.

To switch from branch deploys to the workflow, set Pages to deploy from GitHub
Actions in the repository settings. Then push `main` or run the workflow by hand
from the Actions tab.

The playground uses hash routing (`#playground`) so refreshes stay on the
static `index.html` file that GitHub Pages serves.

## npm

The npm package name `prettier-plugin-salesforce` was not published when this
document was written. The local machine must be logged in before publish:

```sh
npm login
npm whoami
```

Run the full release gate before publishing:

```sh
pnpm release:check
```

Publish from the package directory:

```sh
cd packages/prettier-plugin-salesforce
npm publish --access public
```

After publish, install the package in a separate Salesforce project and run a
real formatting command with Prettier 3.
