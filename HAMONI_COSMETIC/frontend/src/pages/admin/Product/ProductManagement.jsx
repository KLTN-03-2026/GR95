import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { Plus, Search, Filter } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';
import './ProductManagement.css'; 

const ProductManagement = () => {
    const navigate = useNavigate(); 
    
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]); 
    
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // =================================================================
    // PHÂN QUYỀN (Đã đổi thành 'ALL' theo đúng ý bạn)
    // =================================================================
    const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');
    
    const hasPermission = (permissionCode) => {
        // 🔥 NẾU LÀ 'ALL' HOẶC CÓ MÃ QUYỀN THÌ CHO PHÉP
        return userPermissions.includes('ALL') || userPermissions.includes(permissionCode);
    };

    // ===== TẢI DANH MỤC TỪ DATABASE =====
    const loadCategories = async () => {
        try {
            const res = await axiosClient.get('/categories');
            setCategories(res.data || res || []); 
        } catch (error) {
            console.error("Lỗi khi tải danh mục:", error);
        }
    };

    // ===== TẢI SẢN PHẨM =====
    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosClient.get('/products', {
                params: { 
                    search: search.trim(), category: categoryFilter, page: currentPage, limit: 10 
                }
            });

            // THÊM DÒNG NÀY ĐỂ XEM DATA THỰC TẾ TRẢ VỀ LÀ GÌ
            console.log("👉 Dữ liệu API trả về:", res);

            // axiosClient đã return thẳng response.data từ backend.
            // Với API products, shape chuẩn là: { data: [...], pagination: {...} }
            const dataList = Array.isArray(res?.data) ? res.data : [];
            const total = res?.pagination?.totalPages || 1;

            setProducts(dataList);
            setTotalPages(total);
        } catch (err) {
            console.error("❌ Lỗi khi tải danh sách sản phẩm:", err);
            setProducts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter, currentPage]);
    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadProducts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, categoryFilter]);

    const getCategoryName = (maDM) => {
        const foundCategory = categories.find(c => c.MaDM === maDM);
        return foundCategory ? foundCategory.TenDM : 'Khác';
    };

    // CLICK VÀO DÒNG ĐỂ XEM CHI TIẾT
    const handleRowClick = (maSP) => {
        if (hasPermission('VIEW_PRODUCT') || hasPermission('EDIT_PRODUCT')) {
            navigate(`/admin/products/${maSP}`);
        } else {
            alert("Bạn không có quyền xem chi tiết hoặc chỉnh sửa sản phẩm này!");
        }
    };

    return (
        <div className="product-admin-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="main-title m-0">QUẢN LÝ SẢN PHẨM</h1>
                
                {/* ẨN/HIỆN NÚT THÊM MỚI THEO QUYỀN */}
                {hasPermission('ADD_PRODUCT') && (
                    <button className="btn-add-primary" onClick={() => navigate('/admin/products/add')}>
                        <Plus size={18} /> Thêm sản phẩm mới
                    </button>
                )}
            </div>

            <div className="filter-card">
                <div className="search-input-group">
                    <Search className="search-icon" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo Mã SP, Tên sản phẩm..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="category-filter-group">
                    <Filter className="text-muted" size={18} />
                    <select 
                        className="form-select border-0 bg-transparent fw-semibold" 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="all">Tất cả danh mục</option>
                        {categories.map((cat) => (
                            <option key={cat.MaDM} value={cat.MaDM}>
                                {cat.TenDM}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="product-table-wrapper">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th width="15%">MÃ SP</th>
                            <th width="35%">TÊN SẢN PHẨM</th>
                            <th width="20%">DANH MỤC</th>
                            <th width="30%">THÀNH PHẦN CHÍNH</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-5 text-muted">Đang tải dữ liệu...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-5 text-muted">Không tìm thấy sản phẩm nào!</td></tr>
                        ) : (
                            products.map((product) => (
                                <tr 
                                    key={product.MaSP} 
                                    className="product-row clickable-row"
                                    onClick={() => handleRowClick(product.MaSP)}
                                    title="Click để xem chi tiết / chỉnh sửa"
                                >
                                    <td className="product-id-cell">
                                        <span className="product-code">SP{String(product.MaSP).padStart(3, '0')}</span>
                                    </td>
                                    <td>
                                        <strong className="product-name">{product.TenSP}</strong>
                                        <div className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                                            Ngày tạo: {new Date(product.NgayTao).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="category-badge">
                                            {getCategoryName(product.MaDM)}
                                        </span>
                                    </td>
                                    <td>
                                        <p className="ingredient-text" title={product.ThanhPhan}>
                                            {product.ThanhPhan || 'Chưa cập nhật'}
                                        </p>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* PHÂN TRANG */}
                <div className="pagination-wrapper">
                    <button className="pagi-arrow" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>‹</button>
                    <div className="pagi-numbers-group">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                            <button key={pageNum} className={`pagi-item ${currentPage === pageNum ? 'active' : ''}`} onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>
                        ))}
                    </div>
                    <button className="pagi-arrow" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>›</button>
                </div>
            </div>
        </div>
    );
};

export default ProductManagement;