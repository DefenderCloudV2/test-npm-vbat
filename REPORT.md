# npm package metadata, provenance, and SBOM experiment

Recorded: 2026-10-25. Results below distinguish measured evidence from
documented expectations.

## Outcome

Created the public [source repository](https://github.com/DefenderCloudV2/test-npm-vbat)
using the requested `gvp-vikramaditya` GitHub account. Published
`@defendercloudv2/test-npm-vbat@1.0.0` to
[GitHub Packages](https://github.com/orgs/DefenderCloudV2/packages/npm/package/test-npm-vbat).
The package API confirms **private** package visibility, even though its linked
source repository is public.

The successful [publishing run](https://github.com/DefenderCloudV2/test-npm-vbat/actions/runs/40173834520)
built commit `7cf8dd43626b3b1bac3a602161a9029a204aa6bb`. The report was
committed afterward; the later report commit is not the source of version 1.0.0.

**npmjs publishing was deferred by user choice:** no npmjs login was available,
and ownership of the npm scope `@defendercloudv2` was not established. No npmjs
package was published by this experiment, and there is no measured two-registry
comparison yet. No third/private npm service was configured; the measured private
registry case is the private package hosted by GitHub Packages.

## Observed GitHub registry metadata

Evidence was collected with `npm view` for the exact version, `npm pack` to
download that version, and the GitHub Packages REST API.

| Field | Observed value |
| --- | --- |
| Name/version | `@defendercloudv2/test-npm-vbat@1.0.0` |
| Registry | `https://npm.pkg.github.com` |
| Package visibility | `private` |
| Linked repository | `DefenderCloudV2/test-npm-vbat` |
| Declared `repository.url` | `git+https://github.com/DefenderCloudV2/test-npm-vbat.git` |
| Native `gitHead` | Absent from the returned registry metadata |
| `dist.attestations` | Absent |
| `dist.signatures` | Absent |
| `dist.integrity` / `dist.shasum` | Present |
| Publisher (`_npmUser`) | `github-actions[bot]` |
| `_nodeVersion` / `_npmVersion` | `24.21.0` / `11.19.0` |
| Publication timestamp | `2026-10-25T07:43:39Z` |
| Dependency declarations | Four runtime dependencies; `yaml` also appears in `devDependencies` |
| Downloaded tarball identical to build output | Yes, SHA-512 integrity matches |

The registry did **not** automatically expose a commit ID in its packument.
This workflow publishes a prepacked tarball, so that observation should not be
generalized to all npm CLI publishing modes. The package contains a custom
`build-info.json` with the exact commit, repository, ref, workflow, run URL,
run attempt, and tool versions. Its presence was checked inside the tarball
downloaded from the registry, not just in the build workspace.

The GitHub publish step explicitly disables npm-native provenance. Therefore
the absence of `dist.attestations` measures this publishing configuration;
it is **not** a direct test proving that every GitHub Packages provenance request
is rejected. This experiment does not invoke `npm publish --provenance` against
GitHub Packages.

## Signed provenance: a separate GitHub attestation

The workflow explicitly creates two attestations using `actions/attest`, one for
build provenance and one for the CycloneDX SBOM. These are associated with the
tarball's digest in GitHub's attestation service. They are **not** native npm
registry attestations and are not automatically added by publishing a package.

Both were verified locally using `gh attestation verify` against the repository.
The verified build statement and certificate identify:

| Verified item | Value |
| --- | --- |
| Predicate | `https://slsa.dev/provenance/v1` |
| Source repository | `https://github.com/DefenderCloudV2/test-npm-vbat` |
| Git commit | `7cf8dd43626b3b1bac3a602161a9029a204aa6bb` |
| Repository ID / owner ID | `1432943949` / `324759237` |
| Workflow | `.github/workflows/publish.yml` |
| Ref | `refs/heads/main` |
| Trigger | `workflow_dispatch` |
| Runner environment | `github-hosted` |
| Run / attempt | `40173834520` / `1` |
| OIDC issuer | `https://token.actions.githubusercontent.com` |
| Source visibility at signing | `public` |
| Verified transparency timestamp | `2026-10-25T07:43:27Z` |
| SBOM predicate | `https://cyclonedx.org/bom` |

Tarball SHA-256:

```text
5f93023ccc958fa10b9438df762a71f237a4c851a8b0a950e3a5b5cf740187c9
```

Registry and downloaded-tarball SHA-512 integrity:

```text
sha512-uagQpfaieOysacar4tr0X/ng+5Dyhc9TG4FC/CVubGg+JG3gRidTv6K/WaVnuTLbo0B5XOjL9gv0ftL3cCTrZg==
```

The verified attestation binds this artifact digest to the workflow/source.
The custom JSON metadata alone would only be a claim by the package author.
Neither form of provenance proves the code is safe or reproducible.

## SBOM contents

Both JSON SBOMs are included inside the published tarball:

| Format | Contents |
| --- | --- |
| CycloneDX 1.5 (`sbom.cdx.json`) | 30 dependency components; root package in `metadata.component`; dependency graph |
| SPDX 2.3 (`sbom.spdx.json`) | 31 packages including the root; `DEPENDENCY_OF` relationships |

The graph has four direct runtime dependencies and 26 additional transitive
components. Direct versions are `axios@1.20.0`, `chalk@6.0.1`,
`lodash-es@4.18.1`, and `semver@7.8.5`. Transitives include
`follow-redirects`, allowing dependency-graph and SBOM ingestion testing.
The dev-only `yaml@2.9.1` is excluded from both production SBOMs.

The SBOMs describe the installed production dependency tree resolved using
`package-lock.json` at build time. Dependencies are not bundled into the tarball,
and downstream installations can resolve different transitive versions under
their ranges. The SBOM is not a vulnerability scan, and neither registry is
being relied on to generate or automatically discover this embedded SBOM.

## npmjs comparison: documented expectations, not measured results

| Capability | GitHub Packages, observed | Public npmjs, expected when configured |
| --- | --- | --- |
| Publishing identity | Workflow `GITHUB_TOKEN` | npm trusted publishing/OIDC, or an authorized npm token |
| Package visibility | Private | Public via `--access=public` |
| Repository declaration | Preserved | Expected to be preserved; provenance repository must match the public source |
| Native commit metadata | No `gitHead` in this run | Optional `gitHead` is not a reliable substitute for signed provenance |
| Native provenance | Not requested; no `dist.attestations` | `--provenance` or trusted publishing generates npm provenance; inspect `dist.attestations` |
| GitHub build/SBOM attestations | Explicitly generated and verified | Still separate; the workflow can attest the same tarball before publishing |
| Embedded build info/SBOMs | Present | Expected to be identical when target `both` publishes the same tarball |
| Integrity, timestamps, publisher | Captured from registry | Must be collected after an actual publish |

To complete a controlled comparison, establish npm scope ownership and configure
trusted publishing or the `NPM_TOKEN` repository secret as described in the
README. For trusted publishing, allow **direct `npm publish`**, not only staged
publishing. Use a new version, commit it, and dispatch `publish.yml` with target
`both`. Version 1.0.0 already exists on GitHub Packages, so republishing it there
will fail. If using a different npm scope, adapt the manifest and the npmjs scope
configuration; it will no longer be an identical-name comparison.

Then compare the two captured `metadata.json` and `comparison.json` files,
inspect npm's attestation endpoint from `dist.attestations`, and verify npm
registry signatures/provenance with `npm audit signatures` in a consumer
installation. Do not infer successful npm provenance merely from a successful
publish command.

## Evidence and reproducibility

The successful run uploaded artifact `registry-evidence-40173834520-1`
(artifact ID `12591436227`). It contains:

- Original tarball and `pack.json`.
- `build-info.json`, CycloneDX SBOM, and SPDX SBOM.
- GitHub provenance and SBOM Sigstore bundles.
- `github/metadata.json`, `github/comparison.json`, and `github/package.json`.
- A second tarball downloaded from the GitHub registry for integrity comparison.

The artifact expires on **2026-11-24 at 07:43:41 UTC**. A downloaded copy is
retained locally under `evidence\run-40173834520\registry-evidence-40173834520-1`.
Local `evidence\build-verification.json` and `evidence\sbom-verification.json`
contain the CLI verification results. These local files are ignored by Git.

```powershell
gh run download 40173834520 --repo DefenderCloudV2/test-npm-vbat --dir evidence
gh attestation verify .\evidence\registry-evidence-40173834520-1\defendercloudv2-test-npm-vbat-1.0.0.tgz --repo DefenderCloudV2/test-npm-vbat
gh attestation verify .\evidence\registry-evidence-40173834520-1\defendercloudv2-test-npm-vbat-1.0.0.tgz --repo DefenderCloudV2/test-npm-vbat --predicate-type https://cyclonedx.org/bom
```

Five automated tests cover the greeting, invalid inputs, CLI output, workflow
configuration, and SBOM direct/transitive dependencies and dev exclusion. They
passed locally and on the successful GitHub run. The initial workflow run
failed before publishing because npm interpreted a relative `evidence/...`
tarball argument as a GitHub shorthand; it was corrected to `./evidence/...`
with a regression assertion before the successful run.

## References

- [npm provenance requirements and verification](https://docs.npmjs.com/generating-provenance-statements/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [GitHub npm registry authentication and visibility](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitHub artifact and SBOM attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
