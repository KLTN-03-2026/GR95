const test = require('node:test');
const assert = require('node:assert/strict');

const dbPath = require.resolve('../src/config/db');
const operations = [];
const conn = {
  beginTransaction: async () => operations.push('begin'),
  commit: async () => operations.push('commit'),
  rollback: async () => operations.push('rollback'),
  release: () => operations.push('release'),
  execute: async (sql) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.startsWith('SELECT MaDH, MaND, TrangThai, MaVoucher FROM DonHang')) {
      return [[{ MaDH: 12, MaND: 7, TrangThai: 'ChoXacNhan', MaVoucher: 3 }]];
    }
    if (normalized.startsWith('SELECT TrangThai FROM ThanhToan')) return [[{ TrangThai: 'DaThanhToan' }]];
    if (normalized.startsWith('SELECT MaBienThe, SoLuong FROM ChiTietDonHang')) return [[{ MaBienThe: 4, SoLuong: 2 }]];
    operations.push(normalized);
    return [{ affectedRows: 1 }];
  },
  query: async (sql, params) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.startsWith('SELECT LoaiGiaoDich FROM LogTonKho')) return [[{ LoaiGiaoDich: 'XUAT_DON_HANG' }]];
    if (normalized.startsWith('SELECT MaKho, SoLuongTon FROM TonKho')) return [[{ MaKho: 1, SoLuongTon: 4 }]];
    if (normalized.startsWith('SELECT COALESCE(SUM(SoLuongTon)')) return [[{ SoLuongTon: 6 }]];
    return conn.execute(sql, params);
  },
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getConnection: async () => conn } };
const { customerCancelOrder } = require('../src/controllers/orderpaymentController');

test('customer cancellation restores stock deducted by Casso while order awaits confirmation', async () => {
  const req = { user: { id: 7 }, body: { orderId: 12 } };
  let result;
  const res = { json: (data) => { result = data; return res; }, status: (code) => { result = { status: code }; return res; } };
  await customerCancelOrder(req, res);

  assert.equal(result.data.hasCassoPayment, true);
  assert.ok(operations.some((sql) => sql.startsWith?.('UPDATE TonKho SET SoLuongTon = SoLuongTon +')));
  assert.ok(operations.some((sql) => sql.startsWith?.('UPDATE Voucher SET SoLuongDaDung')));
  assert.ok(operations.some((sql) => sql.includes?.("UPDATE DonHang SET TrangThai = 'DaHuy', DaHoanTien = 0")));
  assert.ok(operations.includes('commit'));
  assert.ok(!operations.includes('rollback'));
});
