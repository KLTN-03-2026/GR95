// src/pages/admin/category/CategoryForm.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { categoryApi } from '../../../services/categoryApi';

const CategoryForm = ({ isOpen, onClose, editingId, initialData, onSuccess }) => {
    // State quản lý thông báo Bootstrap
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(e.currentTarget).entries());
        setAlert({ show: false, type: '', message: '' }); // Ẩn thông báo cũ

        try {
            if (editingId) {
                await categoryApi.update(editingId, formData);
                setAlert({ show: true, type: 'success', message: 'Cập nhật danh mục thành công!' });
            } else {
                await categoryApi.create(formData);
                setAlert({ show: true, type: 'success', message: 'Thêm mới danh mục thành công!' });
            }
            
            // Chờ 1.5 giây để người dùng đọc thông báo rồi mới đóng form
            setTimeout(() => {
                onSuccess(); // Báo cho trang cha load lại dữ liệu & đóng form
                setAlert({ show: false, type: '', message: '' }); // Reset thông báo
            }, 1500);

        } catch (err) {
            setAlert({ 
                show: true, 
                type: 'danger', 
                message: err.response?.data?.message || "Thao tác thất bại. Vui lòng thử lại!" 
            });
        }
    };

    return createPortal(
        // Lớp mờ nền dùng class Bootstrap
        <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
        >
            {/* Khung form bị ép chiều rộng tối đa 450px để thon gọn lại */}
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '100%', maxWidth: '450px' }}>
                
                <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">
                    <h5 className="fw-bold m-0" style={{ color: '#81802E' }}>
                        {editingId ? "CẬP NHẬT DANH MỤC" : "THÊM DANH MỤC MỚI"}
                    </h5>
                    <X style={{ cursor: 'pointer', color: '#777' }} onClick={onClose} />
                </div>

                <div className="card-body px-4 pb-4">
                    
                    {/* KHU VỰC THÔNG BÁO ALERT BOOTSTRAP */}
                    {alert.show && (
                        <div className={`alert alert-${alert.type} d-flex align-items-center p-3 mb-4`} role="alert">
                            {alert.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <AlertCircle size={20} className="me-2" />}
                            <div className="fw-medium" style={{ fontSize: '15px' }}>{alert.message}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Mã danh mục</label>
                            <input 
                                key={editingId ? initialData?.MaDM || editingId : 'new'}
                                name="MaDM"
                                type="text" 
                                className="form-control form-control-lg bg-light"
                                style={{ fontSize: '15px' }}
                                placeholder="Ví dụ: DM001"
                                disabled={!!editingId}
                                defaultValue={initialData?.MaDM || ''}
                                onInput={(e) => {
                                    e.target.value = e.target.value.toUpperCase();
                                }}
                                required 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Tên danh mục</label>
                            <input 
                                key={editingId ? `${initialData?.MaDM || editingId}-name` : 'new-name'}
                                name="TenDM"
                                type="text" 
                                className="form-control form-control-lg bg-light"
                                style={{ fontSize: '15px' }}
                                placeholder="Nhập tên danh mục..."
                                defaultValue={initialData?.TenDM || ''}
                                required 
                            />
                        </div>

                        <div className="d-flex gap-3">
                            <button 
                                type="button" 
                                className="btn btn-light flex-grow-1 border fw-semibold" 
                                onClick={onClose}
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                type="submit" 
                                className="btn flex-grow-1 fw-bold text-white shadow-sm" 
                                style={{ backgroundColor: '#81802E' }}
                            >
                                {editingId ? "Lưu thay đổi" : "Thêm mới"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CategoryForm;