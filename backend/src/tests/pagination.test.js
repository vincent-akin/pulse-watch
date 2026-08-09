const { parseOffsetPagination, buildOffsetMeta } = require('../common/pagination');

describe('offset pagination', () => {
  test('defaults to page 1, limit 20', () => {
    expect(parseOffsetPagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });
  test('computes skip correctly', () => {
    expect(parseOffsetPagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, skip: 20 });
  });
  test('caps limit at 100', () => {
    expect(parseOffsetPagination({ limit: '9999' }).limit).toBe(100);
  });
  test('builds meta with total pages', () => {
    expect(buildOffsetMeta({ page: 2, limit: 20, total: 45 })).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
  });
});
