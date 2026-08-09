const slugify = require('../common/slugify');

describe('slugify', () => {
  test('lowercases and hyphenates', () => expect(slugify('Acme Ltd')).toBe('acme-ltd'));
  test('strips special characters', () => expect(slugify('Hello, World!!')).toBe('hello-world'));
  test('falls back for empty input', () => expect(slugify('   ')).toBe('org'));
});
