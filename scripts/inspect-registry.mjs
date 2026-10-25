import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const registries = {
  github: 'https://npm.pkg.github.com',
  npmjs: 'https://registry.npmjs.org',
};
const label = process.argv[2];
if (!Object.hasOwn(registries, label)) {
  throw new Error('Usage: npm run inspect:registry -- github|npmjs');
}
if (!process.env.npm_execpath) {
  throw new Error('Run this script through npm run inspect:registry.');
}
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const directory = `evidence/${label}`;
mkdirSync(directory, { recursive: true });
const npm = (...args) => execFileSync(process.execPath, [
  process.env.npm_execpath, ...args, `--registry=${registries[label]}`,
], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const spec = `${pkg.name}@${pkg.version}`;
const metadata = JSON.parse(npm('view', spec, '--json'));
const downloaded = JSON.parse(npm(
  'pack', spec, '--ignore-scripts', '--json', `--pack-destination=${directory}`,
))[0];
const expected = JSON.parse(readFileSync('evidence/pack.json', 'utf8'))[0];
const result = {
  registry: registries[label],
  package: spec,
  repository: metadata.repository ?? null,
  gitHead: metadata.gitHead ?? null,
  dist: metadata.dist ?? null,
  localIntegrity: expected.integrity,
  downloadedIntegrity: downloaded.integrity,
  identicalTarball: expected.integrity === downloaded.integrity,
  collectedAt: new Date().toISOString(),
};
writeFileSync(`${directory}/metadata.json`, `${JSON.stringify(metadata, null, 2)}\n`);
writeFileSync(`${directory}/comparison.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.identicalTarball) {
  throw new Error('Downloaded package differs from the locally built tarball.');
}
