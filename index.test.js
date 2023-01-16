const { isStale } = require('./util');

// Seme tests that helped me find a very trivial bug.

test('entry with current date is not stale', () => {
  expect(isStale({'timestamp': new Date().toISOString()})).toBe(false);
});

test('entry with a hardcoded date from last year is stale', () => {
  expect(isStale({'timestamp': "2022-01-15T15:15:21.433Z"})).toBe(true);
});
