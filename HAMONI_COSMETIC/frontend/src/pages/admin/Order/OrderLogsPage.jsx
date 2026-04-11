import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrderLogsPage.css';

const OrderLogsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [orderData, setOrderData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/orders/${id}`);
                setOrderData(res.data);
            } catch (err) {
                console.error("🔥 Lỗi API:", err);
                setOrderData({ id: "Lỗi", khachHang: {}, chiTiet: [], lichSu: [] });
            }
        };
        if (id) fetchData();
    }, [id]);

    if (!orderData) return <div className="loading">Đang tải...</div>;

    return (
        <div className="order-container">
            <button className="back-button" onClick={() => navigate(-1)}>
                ← GHI LOG LỊCH SỬ
            </button>

            <div className="order-main-card">
                {/* CỘT TRÁI: THÔNG TIN CHÍNH */}
                <div className="order-info-left">
                    <div className="order-id">#ORD-{orderData.id}</div>
                    
                    <div className="user-profile">
                        <div className="avatar-circle"></div>
                        <div className="user-meta">
                            <div className="user-name">{orderData.khachHang?.hoTen || 'Khách hàng'}</div>
                            <div className="user-email">{orderData.khachHang?.email}</div>
                        </div>
                        <span className="status-badge">● {orderData.trangThai}</span>
                    </div>

                    <div className="product-list">
                        <p className="section-title">Sản phẩm có trong đơn</p>
                        {orderData.chiTiet?.map((item, i) => (
                            <div className="product-item" key={i}>
                                <div className="product-img"></div> {/* Thay bằng <img src={...}/> nếu có */}
                                <div className="product-details">
                                    <p className="product-name">{item.TenSP}</p>
                                    <p className="product-sub">{item.TenBienThe} | SL: {item.soLuong}</p>
                                </div>
                                <div className="product-price">
                                    {new Intl.NumberFormat('vi-VN').format(item.giaBan)}đ
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="total-section">
                        <span className="total-label">Tổng thanh toán:</span>
                        <span className="total-price">{Number(orderData.tongTien || 0).toLocaleString()}đ</span>
                    </div>
                </div>

                {/* CỘT PHẢI: ĐỊA CHỈ & GHI CHÚ */}
                <div className="order-info-right">
                    <div className="side-card info-card">
                        <p className="side-title">THÔNG TIN GIAO HÀNG</p>
                        <p>📍 {orderData.diaChiGiaoHang}</p>
                        <p>📞 {orderData.khachHang?.soDienThoai}</p>
                        <p>🚚 Giao hàng nhanh (GHN)</p>
                    </div>

                    <div className="side-card note-card">
                        <p className="side-title">GHI CHÚ TỪ KHÁCH</p>
                        <p className="note-text">
                            "{orderData.ghiChu || 'Khách hàng không để lại ghi chú.'}"
                        </p>
                    </div>
                </div>
            </div>

            {/* PHẦN DƯỚI: LỊCH SỬ */}
            <div className="history-section">
                <div className="history-header">
                    <h3>Lịch sử hoạt động</h3>
                    <span className="history-icon">🕒</span>
                </div>
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Hành động</th>
                            <th>Người thực hiện</th>
                            <th>Thời gian</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orderData.lichSu?.map((log, index) => (
                            <tr key={index}>
                                <td>
                                    <div className="log-action">
                                        <span className="dot"></span>
                                        <strong>{log.moTa}</strong>
                                    </div>
                                    {log.ghiChu && <small className="log-note">{log.ghiChu}</small>}
                                </td>
                                <td>{log.nguoiThaoTac || "Hệ thống"}</td>
                                <td className="log-time">
                                    {new Date(log.thoiGian).toLocaleString('vi-VN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderLogsPage;