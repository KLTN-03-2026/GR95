// src/pages/admin/Customer/CustomerDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/axiosClient'; // Đổi sang dùng axiosClient
import './CustomerDetail.css';

const CustomerDetail = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCustomerDetail = async () => {
            try {
                // Gọi đúng endpoint backend: /api/customers/detail-analytics/:id
                const res = await axiosClient.get(`/customers/detail-analytics/${id}`);
                
                // AXIOS CLIENT ĐÃ BÓC VỎ SẴN NÊN KHÔNG DÙNG res.data NỮA
                setData(res); 
            } catch (err) {
                console.error("Lỗi fetch chi tiết:", err);
            }
        };

        fetchCustomerDetail();
    }, [id]);

    const getInitials = (name) => {
        if (!name) return "H";
        const parts = name.trim().split(" ");
        return parts[parts.length - 1].charAt(0).toUpperCase();
    };

    const getAvatarBgColor = (name) => {
        const colors = ['#e67e22', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e74c3c'];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };

    if (!data) return <div className="loading-screen">Đang tải dữ liệu Hamoni...</div>;

    const fullName = data.customerInfo?.HoTen || "Khách Hàng";
    const statusText = data.customerInfo?.TrangThai === 1 || data.customerInfo?.TrangThai === 'Hoạt động' ? "Hoạt động" : "Bị chặn";
    const statusClass = statusText === "Hoạt động" ? "status-badge-active" : "status-badge-banned";

    return (
        <div className="admin-detail-analytics-container">
            <div className="analytics-content-wrapper">
                <header className="analytics-header">
                    <button onClick={() => navigate(-1)} className="btn-back-rect">← Quay lại</button>
                    <div className="header-text-group">
                        <h1 className="title-large">CHI TIẾT KHÁCH HÀNG</h1>
                        <p className="subtitle">Hồ sơ khách hàng tại hệ thống Hamoni</p>
                    </div>
                </header>

                {/* Thông tin khách hàng */}
                <div className="info-card profile-info-card">
                    <div className="avatar-box" style={{ backgroundColor: getAvatarBgColor(fullName) }}>
                        {getInitials(fullName)}
                    </div>
                    <div className="profile-details-grid">
                        <div className="detail-item">
                            <label>HỌ VÀ TÊN</label>
                            <h2 className="customer-name-display"><strong>{fullName}</strong></h2>
                        </div>
                        <div className="detail-item">
                            <label>SỐ ĐIỆN THOẠI</label>
                            <p><strong>{data.customerInfo?.SoDienThoai || 'Chưa cập nhật'}</strong></p>
                        </div>
                        <div className="detail-item">
                            <label>EMAIL</label>
                            <p><strong>{data.customerInfo?.Email}</strong></p>
                        </div>
                        <div className="detail-item">
                            <label>ĐỊA CHỈ</label>
                            <p><strong>{data.customerInfo?.DiaChi || 'Chưa cập nhật'}</strong></p>
                        </div>
                    </div>
                </div>

                {/* TRẠNG THÁI */}
                <div className="info-card status-filter-card">
                    <h3 className="card-title-medium">Trạng thái tài khoản</h3>
                    <div className={`status-badge-readonly ${statusClass}`}>
                        ● <strong>{statusText}</strong>
                    </div>
                </div>
                
                {/* LỊCH SỬ & HẠNG */}
                <div className="analytics-bottom-grid">
                    <div className="info-card history-card">
                        <h3 className="card-title-medium">Lịch sử mua hàng</h3>
                        <div className="order-list-vertical">
                            {data.orderHistory?.length > 0 ? (
                                data.orderHistory.map(order => (
                                    <div key={order.MaDH} className="order-item-rect">
                                        <div className="order-left">
                                            <span className="cart-icon">🛒</span>
                                            <span className="order-code"><strong>#HM-DH{order.MaDH}</strong></span>
                                        </div>
                                        <strong className="order-price">
                                            {Number(order.TongTien).toLocaleString('vi-VN')}đ
                                        </strong>
                                    </div>
                                ))
                            ) : (
                                <p className="no-order" style={{color: '#7f8c8d'}}>Chưa có đơn hàng nào.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="info-card membership-rank-card">
                        <label>HẠNG THÀNH VIÊN</label>
                        <h2 className="rank-name-large">Hạng {data.membership?.rankName || 'Đồng'}</h2>
                        <div className="rank-stats">
                            <p>Tổng chi tiêu: <strong>{Number(data.membership?.totalSpent || 0).toLocaleString('vi-VN')}đ</strong></p>
                            <p>Số đơn: <strong>{data.membership?.totalOrders || 0}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetail;