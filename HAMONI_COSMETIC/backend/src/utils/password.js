const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const derive = promisify(scrypt);
const PREFIX = 'scrypt$';

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(String(password), salt, 64);
  return `${PREFIX}${salt}$${hash.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  if (stored.startsWith(PREFIX)) {
    const parts = stored.split('$');
    if (parts.length !== 3 || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{128}$/.test(parts[2])) return false;
    const expected = Buffer.from(parts[2], 'hex');
    const actual = await derive(String(password), parts[1], expected.length);
    return timingSafeEqual(expected, actual);
  }
  // Chấp nhận mật khẩu cũ một lần để nâng cấp bản ghi khi đăng nhập thành công.
  const oldValue = Buffer.from(stored);
  const supplied = Buffer.from(String(password));
  return oldValue.length === supplied.length && timingSafeEqual(oldValue, supplied);
}

module.exports = { hashPassword, verifyPassword, isHashed: (stored) => String(stored).startsWith(PREFIX) };
