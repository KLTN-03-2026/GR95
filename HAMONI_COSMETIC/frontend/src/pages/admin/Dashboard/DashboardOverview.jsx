import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dashboardApi from '../../../services/dashboardApi';
import './DashboardOverview.css';

const DashboardOverview = () => {

  // ===== STATE CHUNG =====
  const [stats, setStats] = useState({
    tongDon: 0, tongDoanhThu: 0, tongSoLuong: 0, trungBinhDon: 0
  });
  const [orders, setOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sanPhams: [], khachHangs: [] });

  // ===== STATE BỘ LỌC (BẢNG & THỐNG KÊ NHANH) =====
  const [keyword, setKeyword] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [sanPham, setSanPham] = useState("all");
  const [khachHang, setKhachHang] = useState("all");

  // ===== STATE BỘ LỌC (BIỂU ĐỒ) =====
  const [cTuNgay, setCTuNgay] = useState("");
  const [cDenNgay, setCDenNgay] = useState("");
  const [cSanPham, setCSanPham] = useState("all");

  // ===== LOAD FILTER OPTIONS =====
  const loadFilters = async () => {
    try {
      const res = await dashboardApi.getFilters();
      setFilters(res || { sanPhams: [], khachHangs: [] });
    } catch (err) {
      console.error(err);
    }
  };

  // ===== LOAD OVERVIEW (BẢNG) =====
  const loadOverview = useCallback(async (type = "search") => {
    try {
      setLoading(true);
      const res = await dashboardApi.getOverview({
        type, keyword, sanPham, khachHang, tuNgay, denNgay
      });
      setStats(res.stats || {});
      setOrders(res.orders || []);
    } catch (err) {
      console.error("Lỗi overview:", err);
    } finally {
      setLoading(false);
    }
  }, [keyword, sanPham, khachHang, tuNgay, denNgay]);

  // ===== LOAD CHART (BIỂU ĐỒ) =====
  const loadChart = useCallback(async () => {
    try {
      const params = {
        sanPham: cSanPham,
        tuNgay: cTuNgay,
        denNgay: cDenNgay
      };
      const res = await dashboardApi.getCharts(params);
      setChartData(res.chartData || []);
    } catch (err) {
      console.error("❌ Lỗi chart:", err);
    }
  }, [cSanPham, cTuNgay, cDenNgay]);

  // ===== ACTIONS: BẢNG =====
  const handleFilterTable = (type) => {
    loadOverview(type);
  };

  const handleResetTable = () => {
    setKeyword(""); setTuNgay(""); setDenNgay(""); setSanPham("all"); setKhachHang("all");
    setStats({ tongDon: 0, tongDoanhThu: 0, tongSoLuong: 0, trungBinhDon: 0 });
    setOrders([]);
    setTimeout(() => loadOverview("reset"), 0);
  };

  const handleExportExcel = () => {
    import("xlsx").then(XLSX => {
      if (orders.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
      }
      const dataToExport = orders.map(o => ({
        "Mã đơn": o.MaDH,
        "Ngày": new Date(o.NgayDat).toLocaleDateString('vi-VN'),
        "Khách": o.KhachHang,
        "Sản phẩm": o.SanPham,
        "SL": o.SoLuong,
        "Giá": o.GiaBan,
        "Doanh thu": o.DoanhThu
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
      XLSX.writeFile(wb, "BaoCao_DonHang.xlsx");
    });
  };

  // ===== ACTIONS: BIỂU ĐỒ =====
  const handleFilterChart = () => {
    loadChart();
  };

  const handleResetChart = () => {
    setCTuNgay(""); setCDenNgay(""); setCSanPham("all");
    setChartData([]);
    setTimeout(() => loadChart(), 0);
  };

  // ===== INIT =====
  useEffect(() => {
    loadFilters();
    loadOverview("reset");
    loadChart();
  }, [loadOverview, loadChart]);

  if (loading && orders.length === 0) {
    return <div style={{ textAlign: "center", padding: 40 }}>Đang tải dữ liệu...</div>;
  }

  return (
    <div className="dashboard-wrapper">

      {/* ===== SECTION 1: THỐNG KÊ NHANH ===== */}
      <div className="custom-card">
        <div className="section-header">📊 Thống kê nhanh</div>
        <div className="stat-row">
          <div className="stat-col">
            <div className="stat-title">🧾 Tổng số đơn</div>
            <div className="stat-value text-primary">{stats.tongDon || 0}</div>
          </div>
          <div className="stat-col">
            <div className="stat-title">💰 Tổng doanh thu (VNĐ)</div>
            <div className="stat-value text-success">{stats.tongDoanhThu?.toLocaleString() || 0}</div>
          </div>
          <div className="stat-col">
            <div className="stat-title">📦 Tổng sản phẩm đã bán</div>
            <div className="stat-value text-info">{stats.tongSoLuong || 0}</div>
          </div>
          <div className="stat-col">
            <div className="stat-title">📊 TB mỗi đơn (VNĐ)</div>
            <div className="stat-value text-warning">{stats.trungBinhDon?.toLocaleString() || 0}</div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: BIỂU ĐỒ (Đã đưa lên trên) ===== */}
      <div className="custom-card">
        <div className="section-header-blue">📈 Biểu đồ thống kê</div>
        
        {/* Bộ lọc biểu đồ ngang */}
        <div className="horizontal-filter">
          <div className="filter-item">
            <label>Từ ngày</label>
            <input type="date" value={cTuNgay} onChange={e => setCTuNgay(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>Đến ngày</label>
            <input type="date" value={cDenNgay} onChange={e => setCDenNgay(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>Sản phẩm</label>
            <select value={cSanPham} onChange={e => setCSanPham(e.target.value)}>
              <option value="all">-- Tất cả --</option>
              {filters.sanPhams.map(sp => (
                <option key={sp.MaSP} value={sp.MaSP}>{sp.TenSP}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-actions-row">
            <button className="btn-green" onClick={handleFilterChart}>📌 Xem biểu đồ</button>
            <button className="btn-gray" onClick={handleResetChart}>🔄 Làm mới</button>
          </div>
        </div>

        {/* Khung Biểu đồ */}
        <div className="chart-container-row">
          
          {/* Chart Doanh Thu */}
          <div className="chart-box">
            <div className="chart-header">Doanh thu hàng tháng</div>
            <div style={{ height: "260px", padding: "10px" }}>
              {chartData && chartData.length > 0 && chartData.some(d => d.revenue > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val)} />
                    <Tooltip formatter={(value) => [value.toLocaleString() + " đ", "Doanh thu"]} />
                    <Bar dataKey="revenue" fill="#4682B4" barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                  ⚠️ Chưa có dữ liệu doanh thu
                </div>
              )}
            </div>
          </div>

          {/* Chart Số Đơn */}
          <div className="chart-box">
            <div className="chart-header">Số đơn hàng theo tháng</div>
            <div style={{ height: "260px", padding: "10px" }}>
              {chartData && chartData.length > 0 && chartData.some(d => d.orders > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [value, "Số đơn"]} />
                    <Line type="monotone" dataKey="orders" stroke="#0d6efd" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                  ⚠️ Chưa có dữ liệu đơn hàng
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ===== SECTION 3: DANH SÁCH ĐƠN HÀNG (Đã đưa xuống dưới) ===== */}
      <div className="custom-card">
        <div className="section-header" style={{ backgroundColor: "#bdca72" }}>📋 Danh sách đơn hàng</div>
        
        {/* Bộ lọc bảng ngang */}
        <div className="horizontal-filter">
          <div className="filter-item">
            <label>Tìm kiếm</label>
            <input 
              type="text" 
              placeholder="🔍 Mã đơn, khách hàng..." 
              value={keyword} 
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterTable("search")}
            />
          </div>
          <div className="filter-item">
            <label>Từ ngày</label>
            <input type="date" value={tuNgay} onChange={e => setTuNgay(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>Đến ngày</label>
            <input type="date" value={denNgay} onChange={e => setDenNgay(e.target.value)} />
          </div>
          <div className="filter-item">
            <label>Sản phẩm</label>
            <select value={sanPham} onChange={e => setSanPham(e.target.value)}>
              <option value="all">-- Tất cả --</option>
              {filters.sanPhams.map(sp => (
                <option key={sp.MaSP} value={sp.MaSP}>{sp.TenSP}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Khách hàng</label>
            <select value={khachHang} onChange={e => setKhachHang(e.target.value)}>
              <option value="all">-- Tất cả --</option>
              {filters.khachHangs.map(kh => (
                <option key={kh.MaND} value={kh.MaND}>{kh.HoTen}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-actions-row">
            <button className="btn-green" onClick={() => handleFilterTable("thongke")} disabled={loading}>
              📌 Thống kê
            </button>
            <button className="btn-gray" onClick={handleResetTable}>🔄 Làm mới</button>
            <button className="btn-export" onClick={handleExportExcel}>📥 Xuất Excel</button>
          </div>
        </div>

        {/* Bảng đơn hàng */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày đặt</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Giá bán</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>Không có dữ liệu</td>
                </tr>
              ) : (
                orders.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: "#a8b948" }}>{o.MaDH}</td>
                    <td>{new Date(o.NgayDat).toLocaleDateString('vi-VN')}</td>
                    <td>{o.KhachHang}</td>
                    <td>{o.SanPham}</td>
                    <td>{o.SoLuong}</td>
                    <td>{o.GiaBan?.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: "#198754" }}>{o.DoanhThu?.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DashboardOverview;