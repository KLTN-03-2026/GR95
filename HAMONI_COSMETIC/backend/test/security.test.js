const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { hashPassword, verifyPassword, isHashed } = require('../src/utils/password');

const dbPath = require.resolve('../src/config/db');
const fakeDb = { execute: async () => [[{ MaND: 7, MaQuyen: 'CUST', TrangThai: 1 }]] };
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
const { verifyToken, requireRole, requireOwner } = require('../src/middlewares/authMiddleware');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('passwords are salted and legacy records can be verified for upgrade', async () => {
  const first = await hashPassword('secret-123');
  const second = await hashPassword('secret-123');
  assert.notEqual(first, second);
  assert.equal(isHashed(first), true);
  assert.equal(await verifyPassword('secret-123', first), true);
  assert.equal(await verifyPassword('wrong', first), false);
  assert.equal(await verifyPassword('secret-123', 'secret-123'), true);
});

test('token middleware reads current role and rejects inactive accounts', async () => {
  process.env.JWT_SECRET = 'test-only-secret';
  const token = jwt.sign({ id: 7, role: 'ADMIN' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = response();
  let nextCalled = false;
  await verifyToken(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.user.role, 'CUST');

  const roleRes = response();
  requireRole('ADMIN')(req, roleRes, () => assert.fail('must not grant stale role'));
  assert.equal(roleRes.statusCode, 403);

  fakeDb.execute = async () => [[{ MaND: 7, MaQuyen: 'CUST', TrangThai: 0 }]];
  const inactiveRes = response();
  await verifyToken({ headers: { authorization: `Bearer ${token}` } }, inactiveRes, () => assert.fail('inactive user'));
  assert.equal(inactiveRes.statusCode, 401);
});

test('owner middleware rejects an ID belonging to another account', () => {
  const req = { user: { id: 7 }, body: { maKhachHang: 8 } };
  const res = response();
  requireOwner('body', 'maKhachHang')(req, res, () => assert.fail('wrong owner'));
  assert.equal(res.statusCode, 403);
  req.body.maKhachHang = '7';
  requireOwner('body', 'maKhachHang')(req, response(), () => {});
});
