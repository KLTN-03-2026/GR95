import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axiosClient from '../../../services/axiosClient';
import './OrderManagement.css';

const OrderManagement = () => {
    const navigate = useNavigate(); 
    
    const [orders, setOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ===== LOAD DATA =====
    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            // 🔥 XỬ LÝ LOGIC ÉP GIỜ Ở ĐÂY 🔥
            let finalStartDate = dateRange.start;
            let finalEndDate = dateRange.end;

            // Ép ngày bắt đầu thành 00:00:00
            if (finalStartDate) {
                finalStartDate = `${finalStartDate} 00:00:00`;
            }

            // Ép ngày kết thúc thành 23:59:59
            if (finalEndDate) {
                finalEndDate = `${finalEndDate} 23:59:59`;
            }

            const res = await axiosClient.get('/orders', {
                params: { 
                    search: search.trim(), 
                    status: statusFilter,
                    startDate: finalStartDate, // Truyền biến đã xử lý
                    endDate: finalEndDate,     // Truyền biến đã xử lý
                    page: currentPage,
                    limit: 5 
                }
            });

            let dataList = res.data || [];
            let totalPages = res.pagination?.totalPages || 1;

            setOrders(dataList);
            setTotalPages(totalPages);
        } catch (err) {
            console.error("❌ Lỗi loadOrders:", err);
            setOrders([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, currentPage, dateRange.start, dateRange.end]);

    // ===== CALL API =====
    useEffect(() => {
        const timer = setTimeout(() => {
            loadOrders();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadOrders]);

    // ===== RESET PAGE =====
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, dateRange.start, dateRange.end]);

    // ===== FORMAT =====
    const formatCurrency = (amount) =>
        new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';

    const getStatusClass = (status) => {
        return `status-badge status-${status}`;
    };

    const tabs = [
        { id: 'all', label: 'Tất cả' },
        { id: 'ChoXacNhan', label: 'Chờ xác nhận' }, 
        { id: 'DangGiao', label: 'Đang giao' },     
        { id: 'HoanThanh', label: 'Hoàn thành' },   
        { id: 'DaHuy', label: 'Đã hủy' },           
    ];

    return (
        <div className="order-admin-container">
            <h1 className="main-title">QUẢN LÝ ĐƠN HÀNG</h1>

            {/* SEARCH */}
            <div className="search-center-wrapper">
                <div className="search-input-group">
                    <input 
                        type="text" 
                        placeholder="Tìm theo Mã đơn hàng, Tên khách hàng..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* FILTER */}
            <div className="filter-tabs-container">
                <div className="status-tabs">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            className={`tab-item ${statusFilter === tab.id ? 'active' : ''}`}
                            onClick={() => setStatusFilter(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="date-filter-group">
                    <span className="filter-label">Lọc theo ngày:</span>
                    <div className="date-inputs">
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        />
                        <span className="date-separator">-</span>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="order-table-wrapper">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>MÃ ĐƠN</th>
                            <th>NGÀY ĐẶT</th>
                            <th>KHÁCH HÀNG</th>
                            <th>TỔNG TIỀN</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-4">Đang tải...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">Không có dữ liệu</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr 
                                    key={order.id} 
                                    className="clickable-row"
                                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                                >
                                    <td className="order-id-cell">
                                        <span className="order-code">#HM-{order.id}</span>
                                    </td>
                                    <td>{new Date(order.ngayTao).toLocaleDateString('vi-VN')}</td>
                                    <td>{order.khachHang}</td>
                                    <td className="total-amount-list">{formatCurrency(order.tongTien)}</td>
                                    <td>
                                        <span className={getStatusClass(order.trangThai)}>
                                            {order.trangThai === 'HoanThanh' ? 'Hoàn thành' : 
                                             order.trangThai === 'DangGiao' ? 'Đang giao' :
                                             order.trangThai === 'ChoXacNhan' ? 'Chờ xác nhận' : 
                                             order.trangThai === 'DaHuy' ? 'Đã hủy' : order.trangThai}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* ===== PAGINATION ===== */}
                <div className="pagination-wrapper">
                    <button 
                        className="pagi-arrow"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        ‹
                    </button>

                    <div className="pagi-numbers-group">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button
                                key={pageNum}
                                className={`pagi-item ${currentPage === pageNum ? 'active' : ''}`}
                                onClick={() => setCurrentPage(pageNum)}
                            >
                                {pageNum}
                            </button>
                        ))}
                    </div>

                    <button 
                        className="pagi-arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        ›
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;