#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [committedDir, freshDir] = process.argv.slice(2);
if (!committedDir || !freshDir) {
  console.error('usage: node .github/scripts/assert-reports-fresh.ts <committedDir> <freshDir>');
  process.exit(2);
}

function withoutGeneratedAt(value) {
  if (Array.isArray(value)) return value.map(withoutGeneratedAt);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'generated_at')
      .map(([key, child]) => [key, withoutGeneratedAt(child)]),
  );
}

function firstDifference(left, right, path = '') {
  if (Object.is(left, right)) return null;
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i += 1) {
      if (i >= left.length || i >= right.length) return { path: `${path}[${i}]`, left: left[i], right: right[i] };
      const found = firstDifference(left[i], right[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in left) || !(key in right)) return { path: childPath, left: left[key], right: right[key] };
      const found = firstDifference(left[key], right[key], childPath);
      if (found) return found;
    }
    return null;
  }
  return { path: path || '<root>', left, right };
}

function display(value) {
  return value === undefined ? '<missing>' : JSON.stringify(value);
}

let failed = false;
for (const file of ['metrics.json', 'benchmarks.json']) {
  let committed;
  let fresh;
  try {
    committed = withoutGeneratedAt(JSON.parse(readFileSync(join(committedDir, file), 'utf8')));
    fresh = withoutGeneratedAt(JSON.parse(readFileSync(join(freshDir, file), 'utf8')));
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    failed = true;
    continue;
  }
  const difference = firstDifference(committed, fresh);
  if (difference) {
    console.error(`${file} differs at ${difference.path}: committed ${display(difference.left)}, fresh ${display(difference.right)}`);
    failed = true;
  } else {
    console.log(`${file}: fresh`);
  }
}

if (failed) process.exit(1);
