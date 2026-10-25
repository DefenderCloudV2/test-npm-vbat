import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== commit) {
  throw new Error('Checked-out commit does not match the workflow commit.');
}
// Ignore generated, untracked files, but never label modified tracked source as clean.
if (git('status', '--porcelain', '--untracked-files=no')) {
  throw new Error('Commit tracked changes before generating package metadata.');
}
const info = {
  package: pkg.name,
  version: pkg.version,
  repository: pkg.repository.url,
  commit,
  ref: process.env.GITHUB_REF || git('rev-parse', '--abbrev-ref', 'HEAD'),
  workflow: process.env.GITHUB_WORKFLOW_REF || null,
  runUrl: process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  node: process.version,
  npm: execFileSync(process.execPath, [process.env.npm_execpath, '--version'], {
    encoding: 'utf8',
  }).trim(),
  generatedAt: new Date().toISOString(),
  note: 'Self-declared build metadata; verify the tarball attestation separately.',
};
writeFileSync('build-info.json', `${JSON.stringify(info, null, 2)}\n`);
console.log(`Recorded source commit ${commit}`);
