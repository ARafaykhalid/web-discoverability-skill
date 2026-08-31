import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Domain, LedgerRecord, Requirement } from './model.ts';
import { DOMAINS, cumulativeLevels } from './model.ts';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REQUIREMENTS_DIR = join(ROOT, 'requirements');

/** A record plus the JSONL line it was parsed from, for error messages. */
export interface RegistryEntry {
  record: Requirement;
  line: number;
}

/** Parse a JSONL file into records, keeping the source line for error messages. */
export function readJsonl(path: string): RegistryEntry[] {
  const text = readFileSync(path, 'utf8');
  const out = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      out.push({ record: JSON.parse(line), line: index + 1 });
    } catch (error) {
      throw new Error(`${path}:${index + 1}: invalid JSON: ${error.message}`);
    }
  });
  return out;
}

/**
 * Load every requirement from requirements/<domain>.jsonl.
 *
 * The JSONL files are the authoritative source. Nothing generates them; the
 * manifest, indexes, and reports are generated *from* them.
 */
export interface Registry {
  records: Requirement[];
  byDomain: Map<string, Requirement[]>;
  byId: Map<string, Requirement>;
  problems: string[];
}

export function loadRegistry({ dir = REQUIREMENTS_DIR } = {}): Registry {
  const records = [];
  const byDomain = new Map();
  const problems = [];

  for (const domain of DOMAINS) {
    const file = join(dir, `${domain.domain}.jsonl`);
    if (!existsSync(file)) {
      problems.push(`missing domain file for declared domain: ${domain.domain}.jsonl`);
      byDomain.set(domain.domain, []);
      continue;
    }
    const entries = readJsonl(file);
    const list = entries.map(({ record, line }) => ({ ...record, __file: `${domain.domain}.jsonl`, __line: line }));
    byDomain.set(domain.domain, list);
    records.push(...list);
  }

  // Surface stray JSONL files that no declared domain or review ledger owns.
  const declared = new Set(DOMAINS.map((d) => `${d.domain}.jsonl`));
  const ledgers = new Set(['removed.jsonl', 'deferred.jsonl']);
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.jsonl') && !ledgers.has(entry) && !declared.has(entry)) {
      problems.push(`orphan registry file not declared in model.ts DOMAINS: ${entry}`);
    }
  }

  const byId = new Map(records.map((r) => [r.id, r]));
  return { records, byDomain, byId, problems };
}

/** Read one of the review ledgers (removed.jsonl, deferred.jsonl). */
export function loadLedger(name: string, { dir = REQUIREMENTS_DIR } = {}): LedgerRecord[] {
  const file = join(dir, `${name}.jsonl`);
  if (!existsSync(file)) return [];
  return readJsonl(file).map(({ record, line }) => ({ ...record, __line: line }));
}

/** The ledger of retired requirement IDs. IDs here must never be reused. */
export function loadRemoved(options = {}): LedgerRecord[] {
  return loadLedger('removed', options);
}

/** Reviewed requirements that are not yet specified well enough to be active. */
export function loadDeferred(options = {}): LedgerRecord[] {
  return loadLedger('deferred', options);
}

/** Load the registry plus both ledgers in one call. */
export function loadAll(options = {}): Registry & { removed: LedgerRecord[]; deferred: LedgerRecord[] } {
  const registry = loadRegistry(options);
  return {
    ...registry,
    removed: loadRemoved(options),
    deferred: loadDeferred(options),
  };
}

export function levelsFor(record: Requirement) {
  return cumulativeLevels(record.minimum_level);
}

/** Deterministic ordering used by every generated artifact. */
export function sortRecords(records: Requirement[]): Requirement[] {
  const domainOrder = new Map(DOMAINS.map((d, i) => [d.domain, i]));
  return [...records].sort((a, b) => {
    const d = (domainOrder.get(a.domain) ?? 99) - (domainOrder.get(b.domain) ?? 99);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Jaccard similarity over word sets. Robust to reordering, unlike ratcheted SequenceMatcher. */
export function tokenSimilarity(a, b) {
  const left = new Set(normalizeText(a).split(' ').filter(Boolean));
  const right = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/** True when `a`'s meaningful words are a subset of `b`'s (subset-duplicate detection). */
export function isSubsumed(a, b, stopwords) {
  const left = normalizeText(a).split(' ').filter((w) => w && !stopwords.has(w));
  const right = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (left.length < 3) return false;
  return left.every((word) => right.has(word));
}
