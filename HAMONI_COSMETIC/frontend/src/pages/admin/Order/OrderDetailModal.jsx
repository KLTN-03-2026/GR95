import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/axiosClient'; 
import InvoiceModal from "./InvoiceModal";
import './OrderManagement.css'; 

const OrderDetailModal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [status, setStatus] = useState(""); 

    // --- 1. THÊM STATE THÔNG BÁO ---
    const [notification, setNotification] = useState(null);

    // Hàm hiện thông báo
    const showSuccess = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };
// Nếu muốn có TẤT CẢ các quyền (quyền cao nhất)
const userPermissions = ['ALL']; 

// Hoặc nếu muốn liệt kê chi tiết từng quyền:
// const userPermissions = ['VIEW_ORDER', 'UPDATE_ORDER', 'PRINT_ORDER', 'CANCEL_ORDER', 'VIEW_ORDER_LOG'];

const isAdmin = userPermissions.includes('ALL');
const canUpdate = isAdmin || userPermissions.includes('UPDATE_ORDER');
const canCancel = isAdmin || userPermissions.includes('CANCEL_ORDER'); // Giờ sẽ là True
const canPrint = isAdmin || userPermissions.includes('PRINT_ORDER');
const canViewLog = isAdmin || userPermissions.includes('VIEW_ORDER_LOG'); // Giờ sẽ là True

    const fetchOrderDetail = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/orders/${id}`);
            setOrder(res.data ?? res);
        } catch (err) {
            console.error("Lỗi tải chi tiết đơn hàng:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOrderDetail();
    }, [fetchOrderDetail]);

    useEffect(() => {
        if (order) {
            setStatus(order.trangThai);
        }
    }, [order]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
    };

    // --- 2. CẬP NHẬT HÀM UPDATE (Bỏ Alert) ---
    const handleUpdateStatus = async () => {
        try {
            await axiosClient.put(`/orders/${id}/status`, {
                newStatus: status
            });

            // Gọi thông báo xịn thay vì alert
            showSuccess("Cập nhật trạng thái đơn hàng thành công!");
            
            fetchOrderDetail(); 
        } catch (err) {
            console.error(err);
            alert("❌ Lỗi cập nhật");
        }
    };

    // --- 3. CẬP NHẬT HÀM HỦY (Bỏ Alert) ---
    const handleCancelOrder = async () => {
        if (!window.confirm("Bạn chắc chắn muốn xóa đơn này?")) return;
        try {
            await axiosClient.put(`/orders/${id}/cancel`);
            
            // Hiện thông báo rồi mới chuyển trang
            showSuccess("Đã hủy đơn hàng thành công!");
            setTimeout(() => navigate('/admin/orders'), 1500);

        } catch (err) {
            console.error("🔥 ERROR:", err.response?.data || err.message);
            alert("❌ Lỗi xóa đơn");
        }
    };

    const buildTimeline = () => {
        if (!order) return [];
        const timeline = [];
        timeline.push({ label: "Đơn hàng đã đặt", time: order.ngayTao });
        const validLogs = (order.lichSu || []).filter(log => log.moTa && !log.moTa.includes("→ ChoXacNhan"));
        validLogs.sort((a, b) => new Date(a.thoiGian) - new Date(b.thoiGian));

        validLogs.forEach(log => {
            let displayLabel = log.moTa;
            const statusMap = {
                "DaXacNhan": "Đã xác nhận đơn hàng",
                "DangGiao": "Đang giao hàng",
                "HoanThanh": "Giao hàng thành công",
                "DaHuy": "Đơn hàng đã bị hủy"
            };
            if (log.moTa.includes("→")) {
                const newStatus = log.moTa.split("→")[1].trim();
                displayLabel = statusMap[newStatus] || newStatus;
            }
            if (timeline.length === 0 || timeline[timeline.length - 1].label !== displayLabel) {
                timeline.push({ label: displayLabel, time: log.thoiGian });
            }
        });
        return timeline;
    };

    if (loading) return <div className="loading-container">Đang tải dữ liệu đơn hàng #{id}...</div>;
    if (!order) return <div className="error-container">Không tìm thấy thông tin đơn hàng!</div>;

    return (
        <div className="order-detail-container">
            {/* --- 4. HIỂN THỊ BANNER THÔNG BÁO --- */}
            {notification && (
                <div className="alert-banner-success">
                    <span className="alert-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M16.6666 5L7.49992 14.1667L3.33325 10" stroke="#1e4620" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </span>
                    {notification}
                </div>
            )}

            <button className="back-btn-text" onClick={() => navigate('/admin/orders')}>
                ← Quay lại danh sách
            </button>

            <h1 className="main-title">XỬ LÝ ĐƠN HÀNG & CẬP NHẬT TRẠNG THÁI</h1>

            <div className="customer-info-card">
                <div className="customer-main">
                    <div className="avatar-circle">
                        {order.khachHang?.hoTen?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div className="info-text">
                        <span className="label-top">KHÁCH HÀNG THÀNH VIÊN</span>
                        <h3>{order.khachHang?.hoTen}</h3>
                        <p>📞 {order.khachHang?.soDienThoai} | ✉️ {order.khachHang?.email}</p>
                    </div>
                </div>
                <div className="shipping-info">
                    <span className="label-top">ĐỊA CHỈ GIAO HÀNG</span>
                    <p>{order.diaChiGiaoHang}</p>
                </div>
            </div>

            <div className="detail-grid-layout">
                <div className="left-column">
                    <div className="products-card">
                        <div className="card-header">
                            <span>Danh mục đơn hàng</span>
                            <span className="product-count">{order.chiTiet?.length} SẢN PHẨM</span>
                        </div>
                        <div className="products-list">
                            {(order.chiTiet || []).map((item, index) => (
                                <div className="product-item" key={index}>
                                    <img className="product-thumb" src={'https://via.placeholder.com/80'} alt={item.tenSP} />
                                    <div className="item-info">
                                        <h4>{item.tenSP || item.TenSP || item.tenSanPham || "Sản phẩm không tên"}</h4> 
                                        <p className="variant">{item.TenBienThe || item.tenBienThe || item.PhanLoai}</p>
                                    </div>
                                    <div className="item-price-qty">
                                        <span className="price">{formatCurrency(item.giaBan)}</span>
                                        <span className="qty">SL: {item.soLuong}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="billing-summary">
                            <div className="bill-row"><span>TẠM TÍNH</span><span>{formatCurrency(order.tamTinh)}</span></div>
                            <div className="bill-row"><span>VOUCHER</span><span>-{formatCurrency(order.giamGia)}</span></div>
                            <div className="bill-row"><span>SHIP</span><span>{formatCurrency(order.phiShip)}</span></div>
                            <div className="bill-total">
                                <span>Tổng</span>
                                <span className="final-price">{formatCurrency(order.tongTien)}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {canPrint && (
                                <button className="full-print-btn" style={{ flex: 1 }} onClick={() => setIsInvoiceOpen(true)}>
                                    🖨️ IN HÓA ĐƠN
                                </button>
                            )}
                            {canViewLog && (
                                <button className="full-print-btn" style={{ flex: 1, background: "#333", color: "#fff" }} onClick={() => navigate(`/admin/orders/${id}/logs`)}>
                                    📜 XEM LỊCH SỬ
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="right-column">
                    <div className="status-control-card">
                        <p className="card-sub-title">📦 Trạng thái đơn hàng</p>
                        <select 
                            className="status-dropdown"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={order.trangThai === "HoanThanh" || order.trangThai === "DaHuy"}
                        >
                            {order.trangThai === "ChoXacNhan" && (
                                <>
                                    <option value="ChoXacNhan">-- Chờ xác nhận --</option>
                                    <option value="DaXacNhan">Xác nhận đơn hàng</option>
                                    <option value="DaHuy">Hủy đơn hàng</option>
                                </>
                            )}
                            {order.trangThai === "DaXacNhan" && (
                                <>
                                    <option value="DaXacNhan">-- Đã xác nhận --</option>
                                    <option value="DangGiao">Bắt đầu giao hàng</option>
                                    <option value="DaHuy">Hủy đơn hàng</option>
                                </>
                            )}
                            {order.trangThai === "DangGiao" && (
                                <>
                                    <option value="DangGiao">-- Đang giao hàng --</option>
                                    <option value="HoanThanh">Đã giao thành công</option>
                                    <option value="DaHuy">Hủy đơn hàng</option>
                                </>
                            )}
                            {order.trangThai === "HoanThanh" && <option value="HoanThanh">Đã hoàn thành</option>}
                            {order.trangThai === "DaHuy" && <option value="DaHuy">Đã hủy</option>}
                        </select>
                        <div className="action-btns">
                            {canCancel && <button className="btn-white" onClick={handleCancelOrder}>HỦY ĐƠN</button>}
                            {canUpdate && <button className="btn-black" onClick={handleUpdateStatus}>CẬP NHẬT</button>}
                        </div>
                    </div>

                    <div className="timeline-card">
                        <p className="card-sub-title">🕒 LỊCH SỬ VẬN HÀNH</p>
                        <div className="timeline-list">
                            {buildTimeline().map((item, index, arr) => (
                                <div key={index} className={`timeline-item ${index === arr.length - 1 ? 'active' : ''}`}>
                                    <div className="dot"></div>
                                    <div className="time-content">
                                        <p>{item.label}</p>
                                        <small>{item.time ? new Date(item.time).toLocaleString('vi-VN') : ''}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isInvoiceOpen && (
                <InvoiceModal 
                    order={order} 
                    onClose={() => setIsInvoiceOpen(false)} 
                    onPrint={() => window.print()}
                />
            )}
        </div>
    );
};

export default OrderDetailModal;