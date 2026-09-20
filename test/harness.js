/**
 * A minimal test harness. Deliberately tiny: the no-build-step constraint rules
 * out a test framework, and the brief does not score test coverage beyond what
 * supports the no-draw and termination argument.
 */

const tests = [];
/** Extra lines a test can report alongside its pass/fail, e.g. search statistics. */
let currentNotes = null;

export function test(name, fn) {
  tests.push({ name, fn });
}

export function note(text) {
  if (currentNotes) currentNotes.push(text);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message ?? 'assertion failed');
}

export function assertEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message ?? 'not equal'}: expected ${b}, got ${a}`);
}

export function assertThrows(fn, message) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(message ?? 'expected a throw');
}

export async function runAll(target) {
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    currentNotes = [];
    const started = performance.now();
    let error = null;
    try {
      await fn();
      passed += 1;
    } catch (e) {
      error = e;
      failed += 1;
    }
    const ms = Math.round(performance.now() - started);
    render(target, { name, error, notes: currentNotes, ms });
    currentNotes = null;
  }

  const summary = document.createElement('p');
  summary.className = failed === 0 ? 'summary pass' : 'summary fail';
  summary.textContent = failed === 0
    ? `All ${passed} checks passed.`
    : `${failed} of ${passed + failed} checks FAILED.`;
  target.prepend(summary);
  return { passed, failed };
}

function render(target, { name, error, notes, ms }) {
  const item = document.createElement('div');
  item.className = error ? 'result fail' : 'result pass';

  const heading = document.createElement('p');
  heading.className = 'result-name';
  heading.textContent = `${error ? 'FAIL' : 'PASS'}  ${name}  (${ms}ms)`;
  item.append(heading);

  for (const line of notes) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = line;
    item.append(p);
  }

  if (error) {
    const p = document.createElement('pre');
    p.className = 'error';
    p.textContent = error.stack ?? String(error);
    item.append(p);
  }

  target.append(item);
  console.log(`${error ? 'FAIL' : 'PASS'}  ${name}`, ...notes, error ?? '');
}
