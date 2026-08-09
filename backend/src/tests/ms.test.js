const ms = require('../common/ms');

describe('ms duration parser', () => {
  test('parses minutes', () => expect(ms('15m')).toBe(15 * 60 * 1000));
  test('parses days', () => expect(ms('30d')).toBe(30 * 24 * 60 * 60 * 1000));
  test('parses seconds', () => expect(ms('45s')).toBe(45 * 1000));
  test('parses hours', () => expect(ms('2h')).toBe(2 * 60 * 60 * 1000));
  test('passes through numbers', () => expect(ms(5000)).toBe(5000));
  test('throws on invalid input', () => expect(() => ms('nonsense')).toThrow());
});
