import axios from 'axios';
import chalk from 'chalk';
import { startCase } from 'lodash-es';
import semver from 'semver';

export function greeting(name = 'package explorer') {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('Name must be a non-empty string.');
  }
  const url = axios.getUri({
    url: 'https://github.com/DefenderCloudV2/test-npm-vbat',
    params: { demo: 'sbom' },
  });
  return chalk.green(`Hello, ${startCase(name)}!`) +
    `\nNode ${semver.clean(process.version)} | Source: ${url}`;
}
