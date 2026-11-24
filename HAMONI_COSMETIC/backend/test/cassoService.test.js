const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const dbPath = require.resolve('../src/config/db');
const operations = [];
let orderStatus = 'ChoThanhToan';
let stock = 2;
const conn = {
  beginTransaction: async () => operations.push('begin'),
  commit: async () => operations.push('commit'),
  rollback: async () => operations.push('rollback'),
  release: () => operations.push('release'),
  query: async (sql, params) => {
    if (sql.includes('ROLLBACK TO SAVEPOINT')) return operations.push('rollback-record');
    if (sql.includes('SAVEPOINT')) return operations.push('savepoint');
    return conn.execute(sql, params);
  },
  execute: async (sql) => {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.startsWith('SELECT dh.MaDH')) return [[{ MaDH: 12, ThanhTien: 100, TrangThai: orderStatus, TrangThaiThanhToan: 'ChoThanhToan', PhuongThuc: 'VNPAY' }]];
    if (normalized.startsWith('SELECT MaDH FROM ThanhToan WHERE MaGiaoDichDoiTac')) return [[undefined]];
    if (normalized.startsWith('SELECT LoaiGiaoDich FROM LogTonKho')) return [[undefined]];
    if (normalized.startsWith('SELECT MaBienThe, SoLuong FROM ChiTietDonHang')) return [[{ MaBienThe: 4, SoLuong: 1 }]];
    if (normalized.startsWith('SELECT MaKho, SoLuongTon FROM TonKho')) return [[{ MaKho: 1, SoLuongTon: stock }]];
    if (normalized.startsWith('SELECT TrangThai, MaVoucher FROM DonHang')) return [[{ TrangThai: orderStatus, MaVoucher: null }]];
    if (normalized.startsWith('SELECT MaBienThe FROM ChiTietDonHang')) return [[{ MaBienThe: 4 }]];
    operations.push(normalized);
    return [{ affectedRows: 1 }];
  }
};
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getConnection: async () => conn } };
const { checkCassoTransactions } = require('../src/config/cassoService');

async function scan(status, availableStock) {
  orderStatus = status;
  stock = availableStock;
  operations.length = 0;
  process.env.CASSO_API_KEY = 'test-only-key';
  const previousGet = axios.get;
  axios.get = async () => ({ data: { data: { records: [{ id: 'bank-77', description: 'HM12', amount: 100 }] } } });
  try { await checkCassoTransactions(); } finally { axios.get = previousGet; }
  return [...operations];
}

test('Casso marks payment after stock deduction', async () => {
  const records = await scan('ChoThanhToan', 2);
  const stockIndex = records.findIndex((sql) => sql.startsWith?.('UPDATE TonKho'));
  const paymentIndex = records.findIndex((sql) => sql.startsWith?.('UPDATE ThanhToan'));
  assert.ok(stockIndex >= 0 && paymentIndex > stockIndex);
  assert.ok(records.includes('commit'));
});

test('paid order without stock is cancelled and flagged for refund', async () => {
  const records = await scan('ChoThanhToan', 0);
  assert.ok(records.includes('rollback-record'));
  assert.ok(records.some((sql) => sql.startsWith?.('UPDATE ThanhToan')));
  assert.ok(records.some((sql) => sql.includes?.("UPDATE DonHang SET TrangThai = 'DaHuy'")));
  assert.ok(!records.some((sql) => sql.startsWith?.('UPDATE TonKho')));
});

test('late transfer for cancelled order is recorded without touching stock', async () => {
  const records = await scan('DaHuy', 2);
  assert.ok(records.some((sql) => sql.startsWith?.('UPDATE ThanhToan')));
  assert.ok(!records.some((sql) => sql.startsWith?.('UPDATE TonKho')));
});
