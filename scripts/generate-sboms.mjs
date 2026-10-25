import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

if (!process.env.npm_execpath) {
  throw new Error('Run this script through npm run sbom.');
}
for (const [format, path] of [
  ['cyclonedx', 'sbom.cdx.json'],
  ['spdx', 'sbom.spdx.json'],
]) {
  const output = execFileSync(process.execPath, [
    process.env.npm_execpath, 'sbom', '--sbom-format', format, '--omit=dev',
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const sbom = JSON.parse(output);
  writeFileSync(path, `${JSON.stringify(sbom, null, 2)}\n`);
  console.log(`Wrote production dependency SBOM: ${path}`);
}
