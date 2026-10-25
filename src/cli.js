#!/usr/bin/env node
import { greeting } from './index.js';

console.log(greeting(process.argv.slice(2).join(' ') || undefined));
