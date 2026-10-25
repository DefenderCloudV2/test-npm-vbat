# npm registry provenance and SBOM sample

A console-only package with four runtime dependencies: `chalk` (formatting),
`lodash-es` (names), `semver` (Node version), and `axios` (URL construction,
without an HTTP request). Axios adds transitive dependencies for SBOM testing.
`yaml` is a development dependency used to check the publishing workflow and is
deliberately excluded from the production SBOMs.

```powershell
npm ci --ignore-scripts
npm test
npm start -- package explorer
npm run sbom
```

## What is captured

- `repository`, `homepage`, and `bugs` in `package.json` are declared metadata.
- `build-info.json` records the exact source commit, repository, workflow ref,
  run URL/attempt, and Node/npm versions. It is generated from clean committed
  source before packing. It is **not itself signed provenance**.
- `sbom.cdx.json` (CycloneDX) and `sbom.spdx.json` (SPDX) list the installed,
  lockfile-pinned production dependencies, including transitives.
- The workflow packs once, then creates GitHub build and SBOM attestations for
  that tarball. These live in GitHub's attestation service, not in npm registry
  metadata. Public-repository attestations use public transparency services.
- Each registry inspection saves the version's metadata, downloads the
  published tarball, and checks its integrity against the original.

SBOMs and build metadata are embedded in the package and uploaded with workflow
evidence. Runtime dependency source files are **not bundled** in the tarball;
npm installs dependencies separately. Consumers can resolve newer transitive
versions under dependency ranges; the SBOM describes this build's locked tree,
not every possible future consumer installation.

## Publishing

The workflow is manual; pushes do not publish. In Actions, run
**Publish and inspect registry metadata** with target `github` (default),
`npmjs`, or `both`. The GitHub CLI equivalent is:

```powershell
gh workflow run publish.yml --repo DefenderCloudV2/test-npm-vbat --ref main -f target=github
```

GitHub uses its short-lived `GITHUB_TOKEN` with `packages: write`. GitHub Packages
initially defaults to private visibility, independently of this public repository;
check the captured package API response for the actual visibility. Installation
from GitHub Packages requires registry authentication even for public packages.

For npmjs, first establish ownership of the **npm** scope `@defendercloudv2`
(GitHub organization membership is not sufficient). Configure a trusted publisher
for organization `DefenderCloudV2`, repository `test-npm-vbat`, workflow
`publish.yml`, allowing direct `npm publish`; alternatively configure a
least-privilege granular `NPM_TOKEN` Actions secret with publish rights and
appropriate 2FA bypass for CI. Never paste tokens into source or workflow files.
A new npm package may require an initial authenticated publish before its package
settings support trusted publisher configuration.

The npmjs step explicitly uses `--access=public --provenance`; GitHub Packages
uses `--provenance=false` and separate GitHub artifact attestations. Do not treat
an absent registry `dist.attestations` field as a failure of the separate GitHub
attestation. This workflow does not probe GitHub's handling of
`npm publish --provenance`.

For a controlled comparison choose `both` after npm access is configured:
both registries receive **identical tarball bytes** from that run. The registry
records, signatures, and native provenance can differ. Bump the version before
publishing again to a registry that already has it; the workflow deliberately
fails on duplicate versions rather than overwriting or claiming success.
Do not enable global `publishConfig.registry` or scope mappings in a committed
`.npmrc`: each workflow publish step explicitly chooses its registry.

## Evidence and verification

Download `registry-evidence-<run-id>-<attempt>` from the Actions run. It contains
the tarball, pack manifest, embedded metadata/SBOMs, two GitHub attestation
bundles, and each selected registry's metadata and integrity comparison.
Artifacts expire after 30 days; retain a downloaded copy for long-term testing.

```powershell
# After downloading the artifact, substitute its actual .tgz filename:
gh attestation verify .\package.tgz --repo DefenderCloudV2/test-npm-vbat
gh attestation verify .\package.tgz --repo DefenderCloudV2/test-npm-vbat --predicate-type https://cyclonedx.org/bom
```

For an npmjs consumer installation, `npm audit signatures` verifies supported
registry signatures and provenance. A `gitHead` string or a custom build-info
file is useful for correlation but does not substitute for signature validation.
The captured metadata reports `gitHead` as `null` if the registry does not expose
it; publishing a prepacked tarball need not populate this optional field.

See [REPORT.md](REPORT.md) for observed results and unresolved setup.
