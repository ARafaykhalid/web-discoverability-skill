import type { Level, Requirement } from './model.ts';
import { DOMAINS, LEVELS, cumulativeLevels, includesValue } from './model.ts';
import type { Applicability, Profile } from './profile.ts';
import { evaluateApplicability, UNKNOWN } from './profile.ts';

/**
 * Two-stage selection.
 *
 * Stage 1 is coarse domain activation, which exists only to keep agent context
 * small. Stage 2 evaluates each requirement's own `applies_when` against the
 * profile. Neither stage is permitted to conclude "does not apply" from missing
 * information: an unknown fact produces UNCERTAIN, which the caller must resolve
 * with evidence rather than by editing files.
 */

export interface DomainActivation {
  state: 'active' | 'inactive' | 'uncertain' | 'unknown-domain';
  reason: string;
  evidence?: string[];
}

export interface EvaluatedEntry {
  record: Requirement;
  status: 'APPLICABLE' | 'NOT_APPLICABLE' | 'UNCERTAIN';
  reason: string;
  facts: Applicability['facts'];
}

export interface Selection {
  level: Level;
  counts: { APPLICABLE: number; NOT_APPLICABLE: number; UNCERTAIN: number };
  total: number;
  activation: (DomainActivation & { domain: string })[];
  activeDomains: string[];
  inactiveDomains: string[];
  uncertainDomains: string[];
  evaluated: EvaluatedEntry[];
  applicable: EvaluatedEntry[];
  uncertain: EvaluatedEntry[];
}

export function domainActivation(domain: string, profile: Profile): DomainActivation {
  const meta = DOMAINS.find((d) => d.domain === domain);
  if (!meta) return { state: 'unknown-domain', reason: `${domain} is not a declared domain` };
  if (meta.activation === 'always') {
    return { state: 'active', reason: 'unconditional domain' };
  }
  const fact = profile?.facts?.[meta.activation];
  if (!fact) {
    return { state: 'uncertain', reason: `profile does not report ${meta.activation}` };
  }
  if (fact.value === UNKNOWN) {
    return { state: 'uncertain', reason: `${meta.activation} is unknown`, evidence: fact.evidence };
  }
  return fact.value
    ? { state: 'active', reason: `${meta.activation} is true`, evidence: fact.evidence }
    : { state: 'inactive', reason: `${meta.activation} is false`, evidence: fact.evidence };
}

export function levelIncludes(level, record) {
  return cumulativeLevels(record.minimum_level).includes(level);
}

/**
 * Select requirements for a level and profile.
 *
 * Returns every candidate with its applicability verdict rather than silently
 * dropping records, so a report can always explain why something was skipped.
 */
/** What `selectRequirements` reads. */
export interface SelectOptions {
  records?: Requirement[];
  profile?: Profile;
  /** A string until `selectRequirements` checks it against LEVELS. */
  level?: string;
  /** Restrict to these domains. null means every declared domain. */
  domains?: string[] | null;
}

export function selectRequirements({ records, profile, level = 'RECOMMENDED', domains = null }: SelectOptions = {}): Selection {
  if (!includesValue(LEVELS, level)) {
    throw new Error(`unknown level ${level}; expected one of ${LEVELS.join(', ')}`);
  }

  const requested = domains ? new Set(domains) : null;
  const activation = new Map();
  for (const domain of DOMAINS) {
    activation.set(domain.domain, domainActivation(domain.domain, profile));
  }

  const evaluated = [];
  for (const record of records) {
    if (requested && !requested.has(record.domain)) continue;
    if (!levelIncludes(level, record)) continue;

    const domainState = activation.get(record.domain)?.state ?? 'uncertain';
    if (domainState === 'inactive') {
      evaluated.push({
        record,
        status: 'NOT_APPLICABLE',
        reason: `domain ${record.domain} inactive: ${activation.get(record.domain).reason}`,
        facts: [],
      });
      continue;
    }

    const applicability = evaluateApplicability(record, profile);
    let status = applicability.verdict;
    if (status === 'APPLICABLE' && domainState === 'uncertain') {
      status = 'UNCERTAIN';
    }
    evaluated.push({
      record,
      status,
      reason:
        status === 'UNCERTAIN'
          ? `needs evidence: ${(applicability.blocking.map((b) => b.fact).join(', ') || activation.get(record.domain).reason)}`
          : status === 'NOT_APPLICABLE'
            ? `condition absent: ${applicability.blocking.map((b) => b.fact).join(', ')}`
            : 'profile satisfies applies_when',
      facts: applicability.facts,
    });
  }

  const counts = evaluated.reduce(
    (acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    },
    { APPLICABLE: 0, NOT_APPLICABLE: 0, UNCERTAIN: 0 },
  );

  return {
    level: level as Level,
    counts,
    total: evaluated.length,
    activation: [...activation.entries()].map(([domain, state]) => ({ domain, ...state })),
    activeDomains: [...activation.entries()].filter(([, s]) => s.state === 'active').map(([d]) => d),
    inactiveDomains: [...activation.entries()].filter(([, s]) => s.state === 'inactive').map(([d]) => d),
    uncertainDomains: [...activation.entries()].filter(([, s]) => s.state === 'uncertain').map(([d]) => d),
    evaluated,
    applicable: evaluated.filter((e) => e.status === 'APPLICABLE'),
    uncertain: evaluated.filter((e) => e.status === 'UNCERTAIN'),
  };
}

/** Candidate counts per level, generated rather than asserted in documentation. */
export function levelCandidateCounts(records) {
  const counts = {};
  for (const level of LEVELS) {
    counts[level] = records.filter((r) => levelIncludes(level, r)).length;
  }
  return counts;
}
