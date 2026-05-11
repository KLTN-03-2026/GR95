import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import warehouseApi from "../../../services/warehouseApi";
import "./WarehouseManagement.css";

const normalizeText = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const normalizeChangeType = (log) => {
    const type = String(log?.LoaiGiaoDich || '').toUpperCase();
    const qty = Number(log?.SoLuongThayDoi || 0);

    if (qty < 0) return 'out';
    if (qty > 0) return 'in';

    if (type.includes('XUAT') || type.includes('TRU')) return 'out';
    if (type.includes('NHAP') || type.includes('CONG')) return 'in';

    return 'in';
};

const getLogTypeLabel = (log) => {
    return normalizeChangeType(log) === 'out' ? 'trừ' : 'cộng';
};

const getLogStatusLabel = (log) => {
    return normalizeChangeType(log) === 'out' ? 'Đang xử lý' : 'Thành công';
};

const getLogQuantityText = (log) => {
    return Math.abs(Number(log?.SoLuongThayDoi || 0));
};

const getProductStockStatus = (quantity) => {
    const qty = Number(quantity || 0);

    if (qty <= 0) {
        return { label: 'HẾT HÀNG', className: 'CANH_BAO' };
    }

    if (qty <= 10) {
        return { label: 'SẮP HẾT', className: 'THAP' };
    }

    return { label: 'SẴN SÀNG', className: 'SAN_SANG' };
};

const getProductDisplayName = (product) => {
    return product?.ten || [product?.tenSanPham, product?.tenBienThe].filter(Boolean).join(" - ") || "Không tên";
};

const getToastProductList = (products, maxItems = 4) => {
    const visibleNames = products.slice(0, maxItems).map(getProductDisplayName);
    const remaining = products.length - visibleNames.length;

    if (remaining > 0) {
        return `${visibleNames.join(', ')} và ${remaining} SP khác`;
    }

    return visibleNames.join(', ');
};

const WarehouseDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logSearchTerm, setLogSearchTerm] = useState('');

    // --- LOGIC PHÂN TRANG ---
    const [currentPage, setCurrentPage] = useState(1);
    const [currentLogPage, setCurrentLogPage] = useState(1);
    const itemsPerPage = 5; 
    const logItemsPerPage = 5;
const userPermissions = ['ALL']; 
const isAdmin = userPermissions.includes('ALL');
const canImport = isAdmin || userPermissions.includes('IMPORT_WAREHOUSE');
const canExport = isAdmin || userPermissions.includes('EXPORT_WAREHOUSE');

const filteredLogs = useMemo(() => {
    const logs = data?.logs || [];
    const keyword = normalizeText(logSearchTerm).trim();

    if (!keyword) return logs;

    return logs.filter((log) => {
        const searchableText = [
            log?.TenSP,
            log?.LoaiGiaoDich,
            log?.SoLuongThayDoi,
            log?.thoiGian,
            getLogStatusLabel(log),
            getLogTypeLabel(log)
        ]
            .map(normalizeText)
            .join(' ');

        return searchableText.includes(keyword);
    });
}, [data?.logs, logSearchTerm]);

const showStockAlerts = useCallback((products = []) => {
    const outOfStock = products.filter((product) => Number(product?.soLuong || 0) <= 0);
    const lowStock = products.filter((product) => {
        const qty = Number(product?.soLuong || 0);
        return qty > 0 && qty <= 10;
    });

    if (outOfStock.length > 0) {
        toast.error(`🚨 SP hết hàng: ${getToastProductList(outOfStock)}.`, {
            autoClose: false,
            closeButton: true,
            className: 'warehouse-toast warehouse-toast-error'
        });
    }

    if (lowStock.length > 0) {
        toast.warning(`⚠ SP sắp hết: ${getToastProductList(lowStock)}.`, {
            autoClose: false,
            closeButton: true,
            className: 'warehouse-toast warehouse-toast-warning'
        });
    }
}, []);

    useEffect(() => {
        setCurrentLogPage(1);
    }, [logSearchTerm]);

    const fetchData = useCallback(async () => {
    try {
        setLoading(true);

        const res = await warehouseApi.getDashboard();

        setData(res);
        showStockAlerts(res?.products || []);

        // reset pagination khi reload dữ liệu
        setCurrentPage(1);
        setCurrentLogPage(1);

    } catch (err) {
        console.error("❌ Lỗi load dashboard:", err);
    } finally {
        setLoading(false);
    }
}, [showStockAlerts]);
const exportLogs = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
        toast.warning("Không có dữ liệu để xuất");
        return;
    }

    const header = ["Thời gian", "Sản phẩm", "Số lượng", "Loại giao dịch"];

    const rows = filteredLogs.map(l => [
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
    
    toast.success("✔ Xuất báo cáo thành công!", {
        icon: '✅',
        style: { backgroundColor: '#4caf50' }
    });
};
    const formatTimeAgo = (time) => {
    if (!time) return "Chưa có";

    const diff = Math.floor((Date.now() - new Date(time)) / 60000);

    if (diff < 1) return "Vừa xong";
    if (diff < 60) return `${diff} phút trước`;

    return new Date(time).toLocaleString("vi-VN");
};

    useEffect(() => {
        if (!location.pathname.startsWith('/admin/warehouse')) return;

        fetchData();
    }, [location.pathname, fetchData]);

    const allProducts = useMemo(() => data?.products || [], [data?.products]);

    const stockSummary = useMemo(() => {
        return allProducts.reduce(
            (acc, product) => {
                const qty = Number(product?.soLuong || 0);

                if (qty <= 0) {
                    acc.outOfStock += 1;
                } else if (qty <= 10) {
                    acc.lowStock += 1;
                } else {
                    acc.ready += 1;
                }

                return acc;
            },
            { outOfStock: 0, lowStock: 0, ready: 0 }
        );
    }, [allProducts]);

    if (loading) {
        return (
            <>
                <div className="loading">Đang tải dữ liệu...</div>
                <ToastContainer
                    position="top-right"
                    autoClose={5200}
                    hideProgressBar={false}
                    newestOnTop={true}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                    limit={5}
                    className="warehouse-toast-container"
                    toastClassName="warehouse-toast"
                    bodyClassName="warehouse-toast-body"
                    progressClassName="warehouse-toast-progress"
                />
            </>
        );
    }

    // Tính toán dữ liệu hiển thị cho trang hiện tại
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = allProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allProducts.length / itemsPerPage);

    const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / logItemsPerPage));
    const activeLogPage = Math.min(currentLogPage, logTotalPages);
    const logIndexOfLastItem = activeLogPage * logItemsPerPage;
    const logIndexOfFirstItem = logIndexOfLastItem - logItemsPerPage;
    const currentLogItems = filteredLogs.slice(logIndexOfFirstItem, logIndexOfLastItem);

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
    <p>SẮP HẾT</p>

    <div className="value-row">
        <h2>{String(stockSummary.lowStock).padStart(2, '0')}</h2>
        <span className="import-label warning">Cần nhập sớm</span>
    </div>

    <span className="sub-text">
        {stockSummary.lowStock > 0
            ? `Có ${stockSummary.lowStock} sản phẩm sắp hết (1-10)`
            : "Không có sản phẩm sắp hết"}
    </span>
</div>

                    <div className="stat-card danger">
                        <p>HẾT HÀNG</p>
                        <div className="value-row">
                            <h2>{String(stockSummary.outOfStock).padStart(2, '0')}</h2>
                            <span className="import-label">Cần nhập</span>
                        </div>
                        <span className="sub-text">Sắp hết: {stockSummary.lowStock}</span>
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
                    <div className="full-width">
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
                                {currentProducts.map((p) => {
                                    const stockStatus = getProductStockStatus(p.soLuong);

                                    return (
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
                                            <span className={`badge ${stockStatus.className}`}>
                                                {stockStatus.label}
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
                                );
                                })}
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

                    {/* Bảng Nhật ký tự động */}
                    <section className="log-container-full">
                        <h3>🕒 Nhật ký tự động</h3>
                        <div className="log-search-box">
                            <input
                                type="text"
                                value={logSearchTerm}
                                onChange={(e) => setLogSearchTerm(e.target.value)}
                                placeholder="Tìm theo từ khóa: tên SP, loại giao dịch, số lượng..."
                                aria-label="Tìm kiếm nhật ký kho"
                            />
                            {logSearchTerm && (
                                <button
                                    type="button"
                                    className="log-search-clear"
                                    onClick={() => setLogSearchTerm('')}
                                    aria-label="Xóa từ khóa tìm kiếm"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        <div className="log-search-meta">
                            Hiển thị {currentLogItems.length} / {filteredLogs.length} nhật ký
                        </div>

                        <div className="log-list">
                            {currentLogItems.map((l, i) => (
                                <div key={i} className="log-item">
                                    <div className={`log-icon ${normalizeChangeType(l) === 'out' ? 'minus' : 'plus'}`}>
                                        {normalizeChangeType(l) === 'out' ? '-' : '+'}
                                    </div>
                                    <div className="log-content-wrapper">
                                        <div className="log-main-text">
                                            <strong>Đã {getLogTypeLabel(l)} {getLogQuantityText(l)} {l.TenSP}</strong>
                                        </div>
                                        <div className="log-sub-text">Mã: #ORD{123+i} - {getLogStatusLabel(l)}</div>
                                        <div className="log-time">{l.thoiGian ? new Date(l.thoiGian).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Chưa có"}</div>
                                    </div>
                                </div>
                            ))}
                            {!filteredLogs.length && (
                                <div className="log-empty-state">
                                    Không tìm thấy nhật ký phù hợp với từ khóa đã nhập.
                                </div>
                            )}
                        </div>
                        {filteredLogs.length > 0 && (
                            <div className="pagination-wrapper">
                                <span className="page-info">
                                    Trang {activeLogPage} / {logTotalPages}
                                </span>
                                <div className="page-buttons">
                                    <button
                                        disabled={activeLogPage === 1}
                                        onClick={() => setCurrentLogPage((prev) => prev - 1)}
                                    >
                                        Trước
                                    </button>
                                    {[...Array(logTotalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            className={activeLogPage === i + 1 ? "active" : ""}
                                            onClick={() => setCurrentLogPage(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        disabled={activeLogPage === logTotalPages}
                                        onClick={() => setCurrentLogPage((prev) => prev + 1)}
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                       <button className="btn-export" onClick={exportLogs}>
    XUẤT BÁO CÁO NHẬT KÝ
</button>
                    </section>
                    </div>
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
            <ToastContainer 
                position="top-right"
                autoClose={5200}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                limit={5}
                className="warehouse-toast-container"
                toastClassName="warehouse-toast"
                bodyClassName="warehouse-toast-body"
                progressClassName="warehouse-toast-progress"
            />

        </div>
    );
};

export default WarehouseDashboard;