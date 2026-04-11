// controllers/dashboardController.js
const db = require('../config/db');
const ExcelJS = require('exceljs');


// ===== BUILD FILTER =====
const buildFilter = (query, isThongKe = false) => {
  let where = "WHERE d.NgayDat IS NOT NULL AND 1=1";
  const params = [];

  // SEARCH
  if (!isThongKe && query.keyword) {
    const kw = `%${query.keyword}%`;
    where += ` AND (
      CAST(d.MaDH AS CHAR) LIKE ?
      OR n.HoTen LIKE ?
      OR sp.TenSP LIKE ?
      OR DATE(d.NgayDat) LIKE ?
    )`;
    params.push(kw, kw, kw, kw);
  }

  // FILTER
  if (query.sanPham && query.sanPham !== 'all') {
    where += " AND sp.MaSP = ?";
    params.push(query.sanPham);
  }

  if (query.khachHang && query.khachHang !== 'all') {
    where += " AND n.MaND = ?";
    params.push(query.khachHang);
  }

  if (query.tuNgay) {
    where += " AND d.NgayDat >= ?";
    params.push(query.tuNgay);
  }

  if (query.denNgay) {
    where += " AND d.NgayDat <= ?";
    params.push(query.denNgay);
  }

  return { where, params };
};


// ===== 1️⃣ FILTER DROPDOWN =====
exports.getFilters = async (req, res) => {
  try {
    const [sanPhams] = await db.query("SELECT MaSP, TenSP FROM SanPham");
    const [khachHangs] = await db.query("SELECT MaND, HoTen FROM NguoiDung");

    res.json({ sanPhams, khachHangs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi filters" });
  }
};


// ===== 2️⃣ OVERVIEW =====
exports.getOverview = async (req, res) => {
  try {
    const type = req.query.type || "search";

    let where = "";
    let params = [];

    if (type === "reset") {
      where = "";
    } else if (type === "thongke") {
      ({ where, params } = buildFilter(req.query, true));
    } else {
      ({ where, params } = buildFilter(req.query, false));
    }

    const [rows] = await db.query(`
      SELECT d.MaDH, d.NgayDat, n.HoTen AS KhachHang,
             sp.TenSP AS SanPham,
             ct.SoLuong,
             ct.DonGia AS GiaBan,
             (ct.SoLuong * ct.DonGia) AS DoanhThu
      FROM DonHang d
      JOIN NguoiDung n ON d.MaND = n.MaND
      JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      JOIN SanPham sp ON bt.MaSP = sp.MaSP
      ${where}
      ORDER BY d.NgayDat DESC
    `, params);

    // ===== CALCULATE =====
    let tongSL = 0;
    const revenueByOrder = {};

    rows.forEach(r => {
      tongSL += Number(r.SoLuong);

      if (!revenueByOrder[r.MaDH]) {
        revenueByOrder[r.MaDH] = 0;
      }

      revenueByOrder[r.MaDH] += Number(r.DoanhThu);
    });

    const tongDT = Object.values(revenueByOrder).reduce((a, b) => a + b, 0);
    const tongDon = Object.keys(revenueByOrder).length;
    const trungBinhDon = tongDon ? tongDT / tongDon : 0;

    res.json({
      stats: {
        tongDon,
        tongSoLuong: tongSL,
        tongDoanhThu: tongDT,
        trungBinhDon
      },
      orders: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi overview" });
  }
};


// ===== 3️⃣ CHART =====
// ===== 3️⃣ CHART =====
exports.getCharts = async (req, res) => {
  try {
    // Tận dụng buildFilter để biểu đồ nhận MỌI bộ lọc
    const { where, params } = buildFilter(req.query, true);

    const tuNgay = req.query.tuNgay;
    const denNgay = req.query.denNgay;
    let isDailyView = false;

    if (tuNgay && denNgay) {
      const start = new Date(tuNgay);
      const end = new Date(denNgay);
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
      if (diffDays <= 31) {
        isDailyView = true;
      }
    }

    // 🔥 SỬA Ở ĐÂY: Dùng DATE_FORMAT để ép MySQL trả về chuỗi (VD: "2026-04-01") né lỗi múi giờ
    const timeGroup = isDailyView ? "DATE_FORMAT(d.NgayDat, '%Y-%m-%d')" : "MONTH(d.NgayDat)";

    const sqlRevenue = `
      SELECT ${timeGroup} AS timeKey, IFNULL(SUM(ct.SoLuong * ct.DonGia), 0) AS revenue
      FROM DonHang d
      INNER JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      INNER JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      INNER JOIN SanPham sp ON bt.MaSP = sp.MaSP
      LEFT JOIN NguoiDung n ON d.MaND = n.MaND
      ${where}
      GROUP BY ${timeGroup}
      ORDER BY timeKey ASC
    `;

    const sqlOrders = `
      SELECT ${timeGroup} AS timeKey, COUNT(DISTINCT d.MaDH) AS orders
      FROM DonHang d
      INNER JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      INNER JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      INNER JOIN SanPham sp ON bt.MaSP = sp.MaSP
      LEFT JOIN NguoiDung n ON d.MaND = n.MaND
      ${where}
      GROUP BY ${timeGroup}
      ORDER BY timeKey ASC
    `;

    console.log("📊 DEBUG getCharts - isDailyView:", isDailyView, "where:", where, "params:", params);
    
    const [revenueRows] = await db.query(sqlRevenue, params);
    const [orderRows] = await db.query(sqlOrders, params);
    
    console.log("📊 DEBUG - revenueRows:", revenueRows);
    console.log("📊 DEBUG - orderRows:", orderRows);
    console.log("📊 DEBUG - Total revenue rows:", revenueRows?.length);
    console.log("📊 DEBUG - Total order rows:", orderRows?.length);

    const chartData = [];

    if (isDailyView) {
      let curr = new Date(tuNgay);
      let end = new Date(denNgay);
      
      while (curr <= end) {
        // Tự build chuỗi ngày bằng tay để khớp chính xác với MySQL
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`; 

        const display = `${dd}/${mm}`;

        // Lọc dữ liệu chính xác 100% bằng chuỗi
        const rev = revenueRows.find(r => r.timeKey === dateStr)?.revenue || 0;
        const ord = orderRows.find(r => r.timeKey === dateStr)?.orders || 0;

        chartData.push({ month: display, revenue: Number(rev), orders: Number(ord) });
        curr.setDate(curr.getDate() + 1); // Cộng lên 1 ngày
      }
    } else {
      for (let i = 1; i <= 12; i++) {
        const revRow = revenueRows.find(r => Number(r.timeKey) === i);
        const ordRow = orderRows.find(r => Number(r.timeKey) === i);
        
        console.log(`🔍 Tháng ${i}: revRow =`, revRow, "ordRow =", ordRow);
        
        chartData.push({
          month: `Tháng ${i}`,
          revenue: Number(revRow?.revenue || 0),
          orders: Number(ordRow?.orders || 0)
        });
      }
    }

    console.log("✅ Final chartData:", chartData);
    res.json({ chartData });

  } catch (err) {
    console.error("Lỗi chart:", err);
    res.status(500).json({ message: "Lỗi tạo dữ liệu biểu đồ" });
  }
};
// ===== 4️⃣ EXPORT EXCEL (XỊN) =====
exports.exportExcel = async (req, res) => {
  try {
    const { where, params } = buildFilter(req.query);

    const [rows] = await db.query(`
      SELECT d.MaDH, d.NgayDat, n.HoTen AS KhachHang,
             sp.TenSP AS SanPham,
             ct.SoLuong,
             ct.DonGia,
             (ct.SoLuong * ct.DonGia) AS DoanhThu
      FROM DonHang d
      JOIN NguoiDung n ON d.MaND = n.MaND
      JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      JOIN SanPham sp ON bt.MaSP = sp.MaSP
      ${where}
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('BaoCao');

    sheet.columns = [
      { header: 'Mã đơn', key: 'MaDH', width: 15 },
      { header: 'Ngày', key: 'NgayDat', width: 20 },
      { header: 'Khách hàng', key: 'KhachHang', width: 25 },
      { header: 'Sản phẩm', key: 'SanPham', width: 25 },
      { header: 'Số lượng', key: 'SoLuong', width: 10 },
      { header: 'Giá', key: 'DonGia', width: 15 },
      { header: 'Doanh thu', key: 'DoanhThu', width: 20 }
    ];

    rows.forEach(r => {
      sheet.addRow({
        ...r,
        NgayDat: new Date(r.NgayDat).toLocaleDateString('vi-VN')
      });
    });

    // HEADER STYLE
    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=baocao.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi export Excel" });
  }
};