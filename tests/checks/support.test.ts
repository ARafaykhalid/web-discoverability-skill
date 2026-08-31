/**
 * Unit tests for tools/lib/check-support.ts.
 *
 * Every check in tools/lib/checks/ is built out of these five primitives, and
 * nothing tested them directly. The coverage that existed reached them only
 * through a check running against a fixture, which means a primitive could change
 * behaviour and be observed only as a shifted finding count in a benchmark case -
 * at which point the case looks wrong and the helper looks innocent.
 *
 * The module's own docstring says the point of it is that "the traps live in one
 * place". These are the traps, one describe block each, and each assertion is
 * written against what the JSDoc on the function claims rather than against what
 * the current call sites happen to need. Inputs are constructed here: a page is a
 * plain object and a check is `{ id }`, so a failure has exactly one cause.
 *
 * Two behaviours pinned below are divergences rather than contracts, and both are
 * commented as such where they appear: `pageCheck` reports PASS for a capture
 * whose pages carry no body, and `findingsFor` lets an item overwrite the
 * `check_id` it is supposed to stamp.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ev, gate, pageCheck, location, lineAt, findingsFor } from '../../tools/lib/check-support.ts';

/** A check, reduced to the one field these helpers read. */
const CHECK = { id: 'demo-check' };

/** A page whose raw and rendered bytes are the same three lines. */
const THREE_LINES = 'line one\nline two\nline three';

function page(extra = {}) {
  return { url: '/p', source_file: 'p.html', raw_html: THREE_LINES, rendered_html: THREE_LINES, ...extra };
}

/** One well-formed finding, emitted for whatever page it is handed. */
function oneFinding(page) {
  return [{
    requirement_id: 'SEO-049',
    location: page.url,
    severity: 'HIGH',
    detail: 'a defect long enough to read like one',
    evidence: [{ type: 'ROUTE', url: page.url }],
  }];
}

describe('ev() builds one evidence item and refuses to have its type overwritten', () => {
  // The collision itself is pinned by tests/regression/evidence-type-collision.test.ts.
  // What is left is the rest of the contract, and the two edges of the guard.

  it('returns the bare type when no detail is supplied', () => {
    assert.deepEqual(ev('ROUTE'), { type: 'ROUTE' }, 'the detail object is optional; an item with only a type is valid evidence');
  });

  it('refuses an own type key even when its value is undefined', () => {
    // `Object.hasOwn`, not truthiness. `{ type: undefined }` spread over the
    // evidence type replaces it with undefined, which is the same defect as
    // replacing it with a string and is harder to see in the emitted item.
    assert.throws(
      () => ev('JSON_LD', { type: undefined }),
      /detail key named "type"/,
      'a present-but-undefined type key still wins the spread, so presence has to be the test rather than value',
    );
  });

  it('allows a type inherited from a prototype, which the spread cannot copy', () => {
    // This is why the guard reads own properties only. Object spread copies own
    // enumerable keys, so an inherited `type` never reaches the result and
    // rejecting it would refuse a detail object that could not have caused harm.
    const detail = Object.create({ type: 'Organization' });
    detail.url = '/about';
    assert.deepEqual(ev('JSON_LD', detail), { type: 'JSON_LD', url: '/about' }, 'the inherited key must neither throw nor leak into the item');
  });

  it('does not validate the type against the evidence vocabulary', () => {
    // The JSDoc says the type "must be declared by the bound requirement". That
    // is a rule about the caller, not one this function enforces - enforcement is
    // tests/checks/contract.test.ts and the benchmark scorer, both of which
    // compare an emitted item against the record it cites. Asserting it here
    // records where the boundary is, so a reader does not assume `ev` checked.
    assert.deepEqual(ev('NOT_A_REAL_TYPE', { a: 1 }), { type: 'NOT_A_REAL_TYPE', a: 1 });
  });
});

describe('gate() reports NEEDS_RUNTIME only when there are no pages', () => {
  it('returns a finished result, not a boolean, when nothing was served', () => {
    assert.deepEqual(gate({ pages: [] }), {
      status: 'NEEDS_RUNTIME',
      findings: [],
      detail: 'no pages available; add snapshot.json or run against a served origin',
    }, 'callers return this value directly, so the status, the empty findings array and the detail are all part of the contract');
  });

  it('returns null as soon as there is one page, even a page with no body', () => {
    // `pages.length === 0` is the documented trigger and the JSDoc calls it the
    // only honest one. A page that exists but carries no HTML is still a page the
    // capture claims to have fetched, and inventing NEEDS_RUNTIME for it would
    // hide a broken capture behind a status that reads like a missing one.
    assert.equal(gate({ pages: [{ url: '/p', raw_html: null, rendered_html: null }] }), null);
  });

  it('reads pages rather than hasRuntime', () => {
    // loadSnapshot derives hasRuntime from pages.length, so the two cannot
    // disagree there. They can disagree in a hand-built snapshot, and the gate
    // has to answer from the thing a check actually reads.
    assert.equal(gate({ pages: [page()], hasRuntime: false }), null, 'a page is present, so the check may proceed regardless of the flag');
    assert.equal(gate({ pages: [], hasRuntime: true }).status, 'NEEDS_RUNTIME', 'no page is present, so there is nothing to read whatever the flag says');
  });
});

describe('pageCheck() gates, filters, then runs per page', () => {
  it('applies the runtime gate before anything else', () => {
    const perPage = () => {
      throw new Error('perPage must not run when there are no pages');
    };
    assert.deepEqual(pageCheck(CHECK, { pages: [] }, perPage), gate({ pages: [] }), 'the gate result is returned unchanged, so no check re-implements it');
  });

  it('drops a page marked indexable: false when indexableOnly is set', () => {
    const snapshot = { pages: [page({ url: '/public' }), page({ url: '/private', indexable: false })] };
    const result = pageCheck(CHECK, snapshot, oneFinding, { indexableOnly: true });
    assert.deepEqual(result.findings.map((f) => f.location), ['/public'], 'a page the capture recorded as non-indexable is outside the scope of an indexing requirement');
  });

  it('keeps a page that never mentions indexable', () => {
    // The filter is `indexable !== false`, so only an explicit false excludes a
    // page. A capture that omits the field has said nothing, and reading silence
    // as "not indexable" would quietly shrink every indexableOnly check to the
    // pages that happened to declare it.
    const result = pageCheck(CHECK, { pages: [{ url: '/undeclared', raw_html: THREE_LINES, rendered_html: THREE_LINES }] }, oneFinding, { indexableOnly: true });
    assert.deepEqual(result.findings.map((f) => f.location), ['/undeclared']);
  });

  it('reports NOT_APPLICABLE, not PASS, when the filter empties the page list', () => {
    const result = pageCheck(CHECK, { pages: [page({ indexable: false })] }, oneFinding, { indexableOnly: true });
    assert.deepEqual(result, { status: 'NOT_APPLICABLE', findings: [], detail: 'no indexable pages' }, 'PASS here would claim the check inspected a page and approved it, which is what NOT_APPLICABLE exists to distinguish');
  });

  it('inspects a non-indexable page when indexableOnly is not set', () => {
    // The other half of the filter. A default that excluded non-indexable pages
    // would satisfy every assertion above and silently narrow the checks that
    // deliberately read them - a noindex page still has to have valid markup.
    const result = pageCheck(CHECK, { pages: [page({ url: '/private', indexable: false })] }, oneFinding);
    assert.equal(result.status, 'FAIL');
    assert.deepEqual(result.findings.map((f) => f.location), ['/private']);
  });

  it('hands perPage the rendered bytes in preference to the raw ones', () => {
    const seen = [];
    const snapshot = { pages: [{ url: '/p', raw_html: 'RAW', rendered_html: 'RENDERED' }] };
    pageCheck(CHECK, snapshot, (_page, html) => {
      seen.push(html);
      return [];
    });
    assert.deepEqual(seen, ['RENDERED'], 'a check reads what the browser ended up with; raw_html is the fallback, not the default');
  });

  it('falls back to raw_html when the capture supplied no rendered document', () => {
    const seen = [];
    pageCheck(CHECK, { pages: [{ url: '/p', raw_html: 'RAW' }] }, (_page, html) => {
      seen.push(html);
      return [];
    });
    assert.deepEqual(seen, ['RAW'], 'the fallback is `??`, so a missing rendered document is read as absent rather than as empty markup');
  });

  it('stamps its own check id onto every finding', () => {
    const result = pageCheck(CHECK, { pages: [page(), page({ url: '/q' })] }, oneFinding);
    assert.deepEqual(result.findings.map((f) => f.check_id), ['demo-check', 'demo-check'], 'a finding whose check_id names nothing cannot be attributed to a module');
  });

  it('skips a page with no body and still reports PASS', () => {
    // A divergence, pinned rather than endorsed. A capture may declare a page and
    // supply no bytes for it - loadSnapshot leaves raw_html null when a declared
    // raw_html_path does not exist, and tests/tools/snapshot.test.ts pins that it
    // does not fabricate one. Such a page passes the gate (pages.length is 1),
    // then `if (!html) continue` skips it, and the empty findings list is reported
    // as PASS. So a capture whose bodies are all missing produces a PASS from
    // every pageCheck-based check having read nothing, which is the outcome this
    // module's own docstring says gating exists to prevent.
    const result = pageCheck(CHECK, { pages: [{ url: '/p', raw_html: null, rendered_html: null }] }, oneFinding);
    assert.deepEqual(result, { status: 'PASS', findings: [] }, 'if this ever becomes NEEDS_RUNTIME, that is a fix and this assertion is the thing to update');
  });

  it('treats a perPage that returns nothing as a clean page', () => {
    assert.deepEqual(pageCheck(CHECK, { pages: [page()] }, () => undefined), { status: 'PASS', findings: [] }, 'perPage may return undefined instead of an empty array; `|| []` is what makes that legal');
  });
});

describe('location() names a real address and a line only when the line is real', () => {
  it('gives file and line when the bytes scanned are the bytes of the file', () => {
    assert.equal(location(page(), 9), 'p.html:2', 'offset 9 is on the second line, and benchmark cases match this string by suffix');
  });

  it('drops the line when a rendered document differs from the file', () => {
    // The documented rule, and the one worth a test of its own. Checks read
    // `rendered_html ?? raw_html`, so once a capture supplies a separate rendered
    // document the offsets address that document. A line number taken from it and
    // printed against the source file would be precise and wrong.
    const hydrated = page({ rendered_html: `${THREE_LINES}\n<h1>added by the client</h1>` });
    assert.equal(location(hydrated, 9), 'p.html', 'the file is still named, because a case has to be able to address it; only the line is withheld');
  });

  it('falls back to the URL when the page has no source file, and discards the offset', () => {
    // A page derived from a capture may exist only as a response. The URL is then
    // the only honest address, and an offset into a document that is not on disk
    // cannot be turned into a line of anything.
    assert.equal(location({ url: '/only-a-url', raw_html: THREE_LINES, rendered_html: THREE_LINES }, 9), '/only-a-url');
  });

  it('reports (unknown) when there is neither a file nor a URL', () => {
    assert.equal(location({ raw_html: THREE_LINES, rendered_html: THREE_LINES }, 9), '(unknown)', 'every finding must carry a location string, so there has to be a value for the case where nothing is known');
  });

  it('names the file without a line when no offset is given', () => {
    assert.equal(location(page()), 'p.html');
    assert.equal(location(page(), null), 'p.html', 'null is the documented "no offset" value and must not be confused with offset 0');
  });

  it('treats offset 0 as a real offset', () => {
    // The guard is `index === null`, deliberately, and this is the assertion that
    // holds it there. A tag at the very start of a document has offset 0, and a
    // truthiness test would strip the line from exactly those findings - the ones
    // pointing at the first line of the file.
    assert.equal(location(page(), 0), 'p.html:1');
  });

  it('withholds the line rather than throwing when the offset is not a usable number', () => {
    assert.equal(location(page(), -1), 'p.html', 'a negative offset addresses nothing, so there is no line to report');
    assert.equal(location(page(), '9'), 'p.html', 'lineAt type-guards the offset, so a string arrives as "no line" rather than as a crash mid-report');
  });
});

describe('lineAt() is what makes those line numbers mean anything', () => {
  it('is 1-based and counts the newlines before the offset', () => {
    assert.equal(lineAt(THREE_LINES, 0), 1, 'the first character is on line 1, not line 0; editors and benchmark cases both count from one');
    assert.equal(lineAt(THREE_LINES, THREE_LINES.indexOf('line two')), 2);
    assert.equal(lineAt(THREE_LINES, THREE_LINES.indexOf('line three')), 3);
  });

  it('clamps an offset past the end to the last line', () => {
    assert.equal(lineAt(THREE_LINES, 10_000), 3, 'the loop stops at text.length, so an offset from a longer document reports the last line instead of running away');
  });

  it('returns null for an offset that cannot address a character', () => {
    assert.equal(lineAt(THREE_LINES, -1), null);
    assert.equal(lineAt(THREE_LINES, '2'), null, 'a string offset is a programming error upstream; returning null makes location() omit the line rather than print "p.html:NaN"');
  });
});

describe('findingsFor() stamps a check id onto findings built by hand', () => {
  it('derives the status from the number of findings', () => {
    assert.deepEqual(findingsFor(CHECK, []), { status: 'PASS', findings: [] });
    const result = findingsFor(CHECK, [{ requirement_id: 'SEO-577', location: 'p.html', evidence: [{ type: 'ROUTE' }] }]);
    assert.equal(result.status, 'FAIL', 'a cross-page check that produced an item has found a defect; the status is not passed in separately');
  });

  it('tolerates a missing item list', () => {
    // Cross-page checks accumulate into a local array and hand it over. `|| []`
    // means a check that returned early with nothing still gets a PASS rather
        // than a TypeError reported as an ERROR status.
    assert.deepEqual(findingsFor(CHECK, null), { status: 'PASS', findings: [] });
    assert.deepEqual(findingsFor(CHECK, undefined), { status: 'PASS', findings: [] });
  });

  it('normalises each item through finding(), defaulting severity and detail', () => {
    const [item] = findingsFor(CHECK, [{
      requirement_id: 'SEO-577',
      location: 'p.html:12',
      evidence: [{ type: 'ROUTE', url: '/p' }],
      note: 'not part of the finding shape',
    }]).findings;
    assert.deepEqual(item, {
      requirement_id: 'SEO-577',
      check_id: 'demo-check',
      location: 'p.html:12',
      evidence: [{ type: 'ROUTE', url: '/p' }],
      severity: 'MEDIUM',
      detail: '',
    }, 'finding() rebuilds the object from six named fields, so an unrecognised key is dropped rather than carried into a report that would never print it');
  });

  it('lets an item overwrite the check id it was supposed to be stamped with', () => {
    // A divergence, pinned rather than endorsed, and the same shape as the defect
    // `ev` refuses: the stamp is written first and the item is spread over it, so
    // `{ check_id: 'demo-check', ...item }` hands the field to whatever the item
    // says. No check in this repository passes check_id by hand, which is why the
    // contract test's per-finding check_id assertion has never caught it. `ev`
    // throws on the equivalent collision; this does not.
    const [item] = findingsFor(CHECK, [{
      requirement_id: 'SEO-577',
      check_id: 'some-other-check',
      location: 'p.html',
      evidence: [{ type: 'ROUTE' }],
    }]).findings;
    assert.equal(item.check_id, 'some-other-check', 'if this ever becomes demo-check, the stamp has been made authoritative and this assertion is the thing to update');
  });
});
