// src/pages/admin/category/CategoryManagement.jsx
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Edit2, Trash2, Box, CheckCircle, Download } from 'lucide-react';
import { categoryApi } from '../../../services/categoryApi';
import CategoryForm from './CategoryForm'; // Import Modal vào
import './Category.css';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState(""); 
    
    // Quản lý Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null); 
    const [currentCat, setCurrentCat] = useState(null);

    const loadData = async () => {
        try {
            const res = await categoryApi.getAll(search);
            console.log("Dữ liệu API trả về:", res); // Thêm dòng này để dễ debug
            setCategories(res);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error); 
        }
    };

    useEffect(() => {
        let isActive = true;

        const fetchCategories = async () => {
            try {
                const res = await categoryApi.getAll(search);
                if (isActive) {
                    setCategories(res);
                }
            } catch (err) {
                console.error("Lỗi tải dữ liệu:", err);
            }
        };

        fetchCategories();

        return () => {
            isActive = false;
        };
    }, [search]);

    const handleOpenAdd = () => {
        setEditingId(null);
        setCurrentCat(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (cat) => {
        setEditingId(cat.MaDM);
        setCurrentCat({ MaDM: cat.MaDM, TenDM: cat.TenDM });
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        loadData(); // Tải lại bảng sau khi thêm/sửa thành công
    };

    const handleDelete = async (id) => {
        if (window.confirm(`Xác nhận xóa danh mục: ${id}?`)) {
            try {
                await categoryApi.delete(id);
                loadData(); 
            } catch (error) {
                console.error("Không thể xóa danh mục này:", error);
                alert("Không thể xóa danh mục này!");
            }
        }
    };

    return (
        <div className="category-page">
            <div className="category-wrapper">
                <h2 className="page-title">QUẢN LÝ DANH MỤC SẢN PHẨM</h2>

                <div className="category-stats-container">
                    <div className="category-stat-card">
                        <div className="category-stat-info">
                            <p className="category-stat-label">Tổng danh mục</p>
                            {/* Đã thêm ?.length || 0 */}
                            <span className="category-stat-number text-italic">{categories?.length || 0}</span>
                        </div>
                        <div className="category-stat-icon blue"><Box size={20} /></div>
                    </div>
                    <div className="category-stat-card">
                        <div className="category-stat-info">
                            <p className="category-stat-label">Đang hoạt động</p>
                            {/* Đã thêm ?.length || 0 */}
                            <span className="category-stat-number text-italic category-text-green">{categories?.length || 0}</span>
                        </div>
                        <div className="category-stat-icon green"><CheckCircle size={20} /></div>
                    </div>
                </div>

                <div className="toolbar">
                    <button className="btn-add" onClick={handleOpenAdd}>
                        <UserPlus size={18} /> THÊM DANH MỤC MỚI
                    </button>
                    
                    <div className="search-group">
                        <div className="search-input-wrapper">
                            <Search className="icon-search" size={16} />
                            <input 
                                type="text" 
                                placeholder="Tìm theo Mã ID, Tên..." 
                                className="search-input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)} 
                            />
                        </div>
                        <button className="btn-download" onClick={categoryApi.exportExcel} title="Xuất file Excel">
                            <Download size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="table-wrapper">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Mã danh mục</th>
                                <th>Tên danh mục</th>
                                <th className="text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Đã thêm kiểm tra mảng an toàn trước khi .map() */}
                            {Array.isArray(categories) && categories.length > 0 ? (
                                categories.map((cat) => (
                                    <tr key={cat.MaDM}>
                                        <td className="col-id">{cat.MaDM}</td>
                                        <td className="col-name">{cat.TenDM}</td>
                                        <td className="col-actions">
                                            <Edit2 size={16} className="icon-edit" onClick={() => handleOpenEdit(cat)} style={{cursor: 'pointer', marginRight: '10px'}}/>
                                            <Trash2 size={16} className="icon-delete" onClick={() => handleDelete(cat.MaDM)} style={{cursor: 'pointer'}}/>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#7f8c8d' }}>
                                        Chưa có dữ liệu danh mục nào để hiển thị.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Nhúng component Modal vào đây */}
                <CategoryForm 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    editingId={editingId} 
                    initialData={currentCat}
                    onSuccess={handleSuccess}
                />

            </div>
        </div>
    );
};

export default CategoryManagement;