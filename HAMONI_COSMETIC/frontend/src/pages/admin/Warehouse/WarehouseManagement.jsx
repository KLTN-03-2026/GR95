import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import warehouseApi from "../../../services/warehouseApi";
import "./WarehouseManagement.css";

const WarehouseDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- LOGIC PHÂN TRANG ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; 
const userPermissions = ['ALL']; 
const isAdmin = userPermissions.includes('ALL');
const canImport = isAdmin || userPermissions.includes('IMPORT_WAREHOUSE');
const canExport = isAdmin || userPermissions.includes('EXPORT_WAREHOUSE');
    const fetchData = async () => {
    try {
        setLoading(true);

        const res = await warehouseApi.getDashboard();

        setData(res);

        // reset pagination khi reload dữ liệu
        setCurrentPage(1);

    } catch (err) {
        console.error("❌ Lỗi load dashboard:", err);
    } finally {
        setLoading(false);
    }
};
const exportLogs = () => {
    if (!data?.logs || data.logs.length === 0) {
        alert("Không có dữ liệu để xuất");
        return;
    }

    const header = ["Thời gian", "Sản phẩm", "Số lượng", "Loại giao dịch"];

    const rows = data.logs.map(l => [
        l.thoiGian ? new Date(l.thoiGian).toLocaleString("vi-VN") : "",
        l.TenSP || "",
        l.SoLuongThayDoi || "",
        l.LoaiGiaoDich === "Tru" ? "Xuất kho" : "Nhập kho"
    ]);

    const csvContent =
        "\uFEFF" + // 🔥 BOM FIX LỖI TIẾNG VIỆT EXCEL
        [header, ...rows]
            .map(row => row.join(";")) // dùng ; cho Excel VN ổn hơn
            .join("\n");

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "bao-cao-nhat-ky-kho.csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
    const formatTimeAgo = (time) => {
    if (!time) return "Chưa có";

    const diff = Math.floor((Date.now() - new Date(time)) / 60000);

    if (diff < 1) return "Vừa xong";
    if (diff < 60) return `${diff} phút trước`;

    return new Date(time).toLocaleString("vi-VN");
};

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

    // Tính toán dữ liệu hiển thị cho trang hiện tại
    const allProducts = data?.products || [];
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = allProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allProducts.length / itemsPerPage);
const processingCount = data?.stats?.processing ?? data?.stats?.pendingOrders ?? 0;
    return (
        <div className="warehouse-container">
            <main className="main-content">
                {/* Header */}
                <div className="header">
                    <h1>TỰ ĐỘNG CẬP NHẬT TỒN KHO</h1>
                    <button
    className="btn-refresh"
    onClick={fetchData}
    disabled={loading}
>
    <span className={loading ? "spin-icon" : ""}>↻</span>
    {loading ? "Đang tải..." : "Làm mới dữ liệu"}
</button>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <p>TỔNG SẢN PHẨM</p>
                        <div className="value-row">
                            <h2>{data?.stats?.totalProducts?.toLocaleString() || " "}</h2>
                            <span className="growth-text"></span>
                        </div>
                        <div className="card-line active"></div>
                    </div>

                    <div className="stat-card">
    <p>ĐANG XỬ LÝ</p>

    <div className="value-row">
        <h2>{processingCount.toLocaleString()}</h2>
        <span className="spin-icon">🔄</span>
    </div>

    <span className="sub-text">
        {processingCount > 0
            ? "Đơn hàng đang chờ xử lý"
            : "Không có đơn hàng"}
    </span>
</div>

                    <div className="stat-card danger">
                        <p>HẾT HÀNG</p>
                        <div className="value-row">
                            <h2>{String(data?.stats?.outOfStock || 0).padStart(2, '0')}</h2>
                            <span className="import-label">Cần nhập</span>
                        </div>
                        <div className="card-dots">...</div>
                    </div>

                    <div className="stat-card">
                        <p>CẬP NHẬT GẦN NHẤT</p>
                        <div className="value-row">
                            <h2>
    {formatTimeAgo(data?.stats?.lastUpdate)}
</h2>
                        </div>
                    </div>
                </div>

                <div className="dashboard-body">
                    {/* Bảng Tồn Kho với Phân Trang */}
                    <div className="section-white">
                        <h3>Bảng theo dõi tồn kho</h3>
                        <table className="inventory-table">
                            <thead>
                                <tr>
                                    <th>SẢN PHẨM</th>
                                    <th>HIỆN CÓ</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>BIẾN ĐỘNG</th>
                                    <th>THỜI GIAN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentProducts.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="product-cell">
                                                <div className="product-img-box"></div>
                                                <div>
                                                    <div className="p-name">{p.ten || [p.tenSanPham, p.tenBienThe].filter(Boolean).join(" - ")}</div>
                                                    <div className="p-sku">SKU: {p.sku || 'HM-SR-012'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="bold-count">{p.soLuong}</td>
                                        <td>
                                            <span className={`badge ${
    p.trangThai === 'HET_HANG'
        ? 'CANH_BAO'
        : p.trangThai === 'SAP_HET'
        ? 'THAP'
        : 'SAN_SANG'
}`}>
                                                {p.trangThai === 'SAN_SANG'
    ? 'SẴN SÀNG'
    : p.trangThai === 'SAP_HET'
    ? 'SẮP HẾT'
    : 'HẾT HÀNG'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={p.bienDong < 0 ? "flux-down" : "flux-up"}>
                                                {p.bienDong === 0 ? "-" : (
    <span className={p.bienDong < 0 ? "flux-down" : "flux-up"}>
        {p.bienDong < 0 ? '↓' : '↑'} {Math.abs(p.bienDong)}
    </span>
)}
                                            </span>
                                        </td>
                                        <td>
    <div className="time-status">
        {p.thoiGian 
            ? new Date(p.thoiGian).toLocaleString("vi-VN")
            : "Chưa có"}
        <span className="dot-green">●</span>
    </div>
</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {/* Bộ Phân Trang */}
                        <div className="pagination-wrapper">
                            <span className="page-info">Hiển thị {currentProducts.length} trên {allProducts.length} sản phẩm</span>
                            <div className="page-buttons">
                                <button 
                                    disabled={currentPage === 1} 
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    Trước
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button 
                                        key={i} 
                                        className={currentPage === i + 1 ? "active" : ""}
                                        onClick={() => setCurrentPage(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button 
                                    disabled={currentPage === totalPages} 
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Nhật ký với Thanh Cuộn */}
                    <aside className="log-container">
                        <h3>🕒 Nhật ký tự động</h3>
                        <div className="log-list scrollable">
                            {data?.logs?.map((l, i) => (
                                <div key={i} className="log-item">
                                    <div className={`log-icon ${l.LoaiGiaoDich === 'Tru' ? 'minus' : 'plus'}`}>
                                        {l.LoaiGiaoDich === 'Tru' ? '-' : '+'}
                                    </div>
                                    <div className="log-content-wrapper">
                                        <div className="log-main-text">
                                            <strong>Đã {l.LoaiGiaoDich === 'Tru' ? 'trừ' : 'cộng'} {l.SoLuongThayDoi} {l.TenSP}</strong>
                                        </div>
                                        <div className="log-sub-text">Mã: #ORD{123+i} - {l.LoaiGiaoDich === 'Tru' ? 'Đang xử lý' : 'Thành công'}</div>
                                        <div className="log-time">10:45 AM</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                       <button className="btn-export" onClick={exportLogs}>
    XUẤT BÁO CÁO NHẬT KÝ
</button>
                    </aside>
                </div>

                {/* AI Footer Bar */}
                <footer className="ai-validation-bar">
                    <div className="ai-info">
                        <span className="shield">🛡️</span>
                        <span>Phiếu xuất nhập <strong>Hamoni</strong></span>
                        <span className="cloud">☁️</span>
                    </div>
                    <div className="footer-btns">
                       {canExport && (
    <button 
        className="btn-outline"
        onClick={() => navigate("/admin/warehouse-logs?type=outbound")}
    >
        Xuất Kho
    </button>
)}

{canImport && (
    <button 
        className="btn-dark"
        onClick={() => navigate("/admin/warehouse-logs?type=inbound")}
    >
        Nhập Kho
    </button>
)}
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default WarehouseDashboard;