import React, { useState, useEffect, useCallback } from 'react';
import {BarChart, Bar, LineChart, Line,XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import dashboardApi from '../../../services/dashboardApi';
import './DashboardOverview.css';

const DashboardOverview = () => {

  // ===== STATE =====
  const [stats, setStats] = useState({
    tongDon: 0,
    tongDoanhThu: 0,
    tongSoLuong: 0,
    trungBinhDon: 0
  });

  const [orders, setOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== FILTER =====
  const [keyword, setKeyword] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [sanPham, setSanPham] = useState("all");
  const [khachHang, setKhachHang] = useState("all");

  const [filters, setFilters] = useState({ sanPhams: [], khachHangs: [] });

  // ===== LOAD FILTER =====
  const loadFilters = async () => {
    try {
      const res = await dashboardApi.getFilters();
      // Vì đã cấu hình axiosClient bóc data, nên res chính là data
      setFilters(res || { sanPhams: [], khachHangs: [] });
    } catch (err) {
      console.error(err);
    }
  };

  // ===== LOAD OVERVIEW =====
  const loadOverview = useCallback(async (type = "search") => {
    try {
      setLoading(true);

      const res = await dashboardApi.getOverview({
        type,
        keyword,
        sanPham,
        khachHang,
        tuNgay,
        denNgay
      });

      setStats(res.stats || {});
      setOrders(res.orders || []);

    } catch (err) {
      console.error("Lỗi overview:", err);
    } finally {
      setLoading(false);
    }
  }, [keyword, sanPham, khachHang, tuNgay, denNgay]);

  // ===== LOAD CHART =====
  const loadChart = useCallback(async () => {
    try {
      const params = {
        keyword,     // Để biểu đồ nhảy khi gõ ô search
        sanPham,     // Để biểu đồ nhảy khi chọn dropdown
        khachHang,   
        tuNgay,
        denNgay
      };
      
      console.log("📊 [Frontend] loadChart called with params:", params);
      
      const res = await dashboardApi.getCharts(params);
      
      console.log("📊 [Frontend] Response from backend:", res);
      console.log("📊 [Frontend] chartData length:", res.chartData?.length);
      console.log("📊 [Frontend] chartData:", res.chartData);

      setChartData(res.chartData || []);
    } catch (err) {
      console.error("❌ Lỗi chart:", err);
    }
  }, [keyword, sanPham, khachHang, tuNgay, denNgay]);

  // ===== ACTION =====
  const handleSearch = () => {
    loadOverview("search");
    loadChart();
  };

  const handleThongKe = () => {
    loadOverview("thongke");
    loadChart();
  };

  // 🔥 RESET CHUẨN (XÓA DATA LUÔN)
  const handleReset = () => {
    setKeyword("");
    setTuNgay("");
    setDenNgay("");
    setSanPham("all");
    setKhachHang("all");

    // ❗ reset UI luôn (quan trọng)
    setStats({
      tongDon: 0,
      tongDoanhThu: 0,
      tongSoLuong: 0,
      trungBinhDon: 0
    });
    setOrders([]);
    setChartData([]);

    // load lại data sạch từ server
    setTimeout(() => {
      loadOverview("reset");
      loadChart();
    }, 0);
  };

  // ===== EXPORT EXCEL (FE ONLY) =====
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

      {/* ===== SECTION 1: HEADER & STATS ===== */}
      <div className="custom-card">
        <div className="section-header">
          📊 Thống kê nhanh
        </div>
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

      {/* ===== SECTION 2: CHART + FILTER ===== */}
      <div className="custom-card">
        <div className="section-header-blue">
          📈 Biểu đồ & Bộ lọc
        </div>
        <div className="main-row">
          
          {/* LEFT CHART */}
          <div className="left-chart">
            <div className="chart-row">
              
              {/* Doanh Thu */}
              <div className="chart-box" style={{ minWidth: 0 }}>
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

              {/* Số Đơn */}
              <div className="chart-box" style={{ minWidth: 0 }}>
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

          {/* RIGHT FILTER */}
          <div className="right-filter">
            <div className="filter-card h-100">
              <div className="filter-header">Bộ lọc thống kê</div>
              <div className="filter-body">
                <div className="form-group">
                  <label>Từ ngày</label>
                  <input type="date" className="form-control" value={tuNgay} onChange={e => setTuNgay(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Đến ngày</label>
                  <input type="date" className="form-control" value={denNgay} onChange={e => setDenNgay(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sản phẩm</label>
                  <select className="form-control" value={sanPham} onChange={e => setSanPham(e.target.value)}>
                    <option value="all">-- Tất cả --</option>
                    {filters.sanPhams.map(sp => (
                      <option key={sp.MaSP} value={sp.MaSP}>{sp.TenSP}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Khách hàng</label>
                  <select className="form-control" value={khachHang} onChange={e => setKhachHang(e.target.value)}>
                    <option value="all">-- Tất cả --</option>
                    {filters.khachHangs.map(kh => (
                      <option key={kh.MaND} value={kh.MaND}>{kh.HoTen}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-actions mt-3">
                  <button className="btn-green" onClick={handleThongKe} disabled={loading}>
                    {loading ? "Đang xử lý..." : "📌 Thống kê"}
                  </button>
                  <button className="btn-gray" onClick={handleReset}>
                    🔄 Làm mới
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ===== SECTION 3: TOOLBAR TÌM KIẾM & XUẤT EXCEL ===== */}
      <div className="toolbar">
        <div className="toolbar-search">
          <input 
            type="text" 
            placeholder="🔍 Tìm mã đơn, khách hàng, sản phẩm..." 
            value={keyword} 
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>Tìm</button>
        </div>
        <button className="toolbar-export" onClick={handleExportExcel}>
          📥 Xuất Excel
        </button>
      </div>

      {/* ===== SECTION 4: TABLE ===== */}
      <div className="custom-card">
        <div className="section-header" style={{ backgroundColor: "#bdca72" }}>
          📋 Danh sách đơn hàng
        </div>
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
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    Không có dữ liệu
                  </td>
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