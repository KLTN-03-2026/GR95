// src/pages/admin/Customer/CustomerManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/axiosClient'; 
import { Search, Download, Trash2, Eye } from 'lucide-react'; // Đổi sang dùng Lucide React cho đồng bộ
import './CustomerManagement.css'; 

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [status, setStatus] = useState('Tất cả trạng thái');
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    let userPermissions = [];
    try {
        userPermissions = JSON.parse(localStorage.getItem('userPermissions')) || [];
    } catch {
        userPermissions = [];
    }
    
    const isAdmin = userPermissions.includes('ALL');
    const canDelete = isAdmin || userPermissions.includes('DELETE_CUSTOMER');
    const recordsPerPage = 5;

    const loadCustomers = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/customers`, {
                params: { search, status }
            });
            setCustomers(res); 
            setCurrentPage(1);
        } catch (err) {
            console.error("Lỗi tải danh sách khách hàng:", err);
            setCustomers([]); 
        }
    }, [search, status]);

    useEffect(() => {
        const initFetch = async () => {
            await loadCustomers();
        };
        initFetch();
    }, [loadCustomers]);

    const handleDelete = async (id) => {
        if (!canDelete) return alert("Bạn không có quyền thực hiện thao tác này!");
        if (window.confirm("Bạn có chắc chắn muốn xóa khách hàng này không?")) {
            try {
                await axiosClient.delete(`/customers/${id}`);
                alert("Xóa thành công!");
                loadCustomers();
            } catch {
                alert("Xóa thất bại!");
            }
        }
    };

    // HÀM XUẤT EXCEL CHUẨN BẢO MẬT (Dùng axiosClient để tự động kèm Token)
    const handleExportExcel = async () => { 
        try {
            const response = await axiosClient.get('/customers/export', {
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'DanhSachKhachHang.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Lỗi khi tải file Excel:", error);
            alert("Bạn không có quyền xuất file hoặc có lỗi xảy ra!");
        }
    };

    const safeCustomers = Array.isArray(customers) ? customers : [];
    
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRecords = safeCustomers.slice(firstIndex, lastIndex);
    const nPage = Math.ceil(safeCustomers.length / recordsPerPage);
    const numbers = [...Array(nPage + 1).keys()].slice(1);

    return (
        <div className="admin-container">
            <h1 className="title">QUẢN LÝ KHÁCH HÀNG</h1>
            <div className="toolbar">
                <div className="search-box-wrapper">
                    <Search className="search-icon-inner" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo Mã ID, Tên..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>  
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Bị chặn">Bị chặn</option>
                    </select>
                    <button className="download-btn" title="Xuất Excel" onClick={handleExportExcel}>
                        <Download size={20} />
                    </button>
                </div>
            </div>        
            <div className="table-card">
                <table className="customer-table">
                    <thead>
                        <tr>
                            <th>MÃ KH</th>
                            <th>TÊN KHÁCH HÀNG</th>
                            <th>LIÊN HỆ</th>
                            <th>TRẠNG THÁI</th>
                            <th>HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.length > 0 ? currentRecords.map((item) => (
                            <tr key={item.MaND}>
                                <td style={{ color: '#888' }}>#HM-{item.MaND}</td>
                                <td>
                                    <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div className="avatar">{item.HoTen?.charAt(0).toUpperCase() || 'U'}</div>
                                        <span style={{ fontWeight: '600' }}>{item.HoTen}</span>
                                    </div>
                                </td>
                                <td>
                                    <div>{item.Email}</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>{item.SoDienThoai}</div>
                                </td>
                                <td>
                                    <span className={`status-badge ${item.TrangThai === 'Bị chặn' || item.TrangThai === 0 ? 'status-banned' : 'status-active'}`}>
                                        ● {item.TrangThai === 1 || item.TrangThai === 'Hoạt động' ? 'Hoạt động' : 'Bị chặn'}
                                    </span>
                                </td>
                                <td>
                                    {canDelete && (
                                        <button className="icon-btn btn-delete" title="Xóa" onClick={() => handleDelete(item.MaND)}>
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button className="icon-btn btn-view" title="Xem chi tiết" onClick={() => navigate(`/admin/customer-detail/${item.MaND}`)}>
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#7f8c8d' }}>
                                    Không tìm thấy dữ liệu khách hàng
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {nPage > 1 && (
                    <div className="pagination-container">
                        {numbers.map(n => (
                            <button key={n} onClick={() => setCurrentPage(n)} className={`page-number ${currentPage === n ? 'active' : ''}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerManagement;