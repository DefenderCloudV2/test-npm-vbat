import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { parse } from 'yaml';
import { greeting } from '../src/index.js';

test('greets without making a network request', () => {
  assert.match(greeting(), /Hello, Package Explorer!/);
  assert.match(greeting('sbom tester'), /Hello, Sbom Tester!/);
  assert.match(greeting(), /Node \d+\.\d+\.\d+.*demo=sbom/);
});

test('rejects invalid names', () => {
  for (const name of ['', '  ', null, 42]) {
    assert.throws(() => greeting(name), TypeError);
  }
});

test('CLI prints a greeting', () => {
  const output = execFileSync(process.execPath, ['src/cli.js', 'registry', 'tester'], {
    encoding: 'utf8',
  });
  assert.match(output, /Hello, Registry Tester!/);
});

test('publishing is manual, registries are explicit, and actions are pinned', () => {
  const workflow = parse(readFileSync('.github/workflows/publish.yml', 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.target.options, ['github', 'npmjs', 'both']);
  assert.equal(workflow.permissions.contents, 'read');
  assert.equal(workflow.jobs.publish.permissions['id-token'], 'write');
  for (const step of workflow.jobs.publish.steps) {
    if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
  }
  const commands = workflow.jobs.publish.steps.map(step => step.run || '').join('\n');
  assert.match(commands, /--registry=https:\/\/npm\.pkg\.github\.com --provenance=false/);
  assert.match(commands, /--registry=https:\/\/registry\.npmjs\.org --access=public --provenance/);
});

test('SBOMs include direct and transitive runtime dependencies, not dev dependencies', () => {
  execFileSync(process.execPath, ['scripts/generate-sboms.mjs'], {
    env: process.env,
    encoding: 'utf8',
  });
  const cdx = JSON.parse(readFileSync('sbom.cdx.json', 'utf8'));
  const spdx = JSON.parse(readFileSync('sbom.spdx.json', 'utf8'));
  assert.equal(cdx.bomFormat, 'CycloneDX');
  assert.match(spdx.spdxVersion, /^SPDX-/);
  const cdxNames = cdx.components.map(component => component.name);
  const spdxNames = spdx.packages.map(pkg => pkg.name);
  for (const names of [cdxNames, spdxNames]) {
    for (const name of ['axios', 'chalk', 'lodash-es', 'semver', 'follow-redirects']) {
      assert.ok(names.includes(name), `Missing runtime dependency ${name}`);
    }
    assert.ok(!names.includes('yaml'), 'Development dependency leaked into production SBOM');
    assert.ok(names.length > 4, 'Expected transitive dependencies');
  }
  assert.ok(cdx.dependencies.some(dependency => dependency.dependsOn.length > 0));
  assert.ok(spdx.relationships.some(relationship => relationship.relationshipType === 'DEPENDENCY_OF'));
});
