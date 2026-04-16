import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosClient from "../../../services/axiosClient"; 
import './PromotionCreate.css';

const PromotionCreate = () => {
    const navigate = useNavigate();
    const [availableProducts, setAvailableProducts] = useState([]); 
    const [selectedVariants, setSelectedVariants] = useState([]);   

    const [newPromo, setNewPromo] = useState({
        TenCTKM: '', LoaiGiamGia: 'PhanTram', GiaTriGiam: '', NgayBatDau: '', NgayKetThuc: '', Banner: ''
    });

    // CÁC STATE MỚI CHO TÍNH NĂNG UX
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({}); // Lưu trạng thái gập/mở của từng nhóm

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const productRes = await axiosClient.get('promotions/variants-for-promo'); 
                setAvailableProducts(productRes || []);
            } catch (error) {
                console.error("Lỗi tải sản phẩm:", error);
            }
        };
        fetchProducts();
    }, []);

    // Nhóm sản phẩm và tự động LỌC THEO TỪ KHÓA TÌM KIẾM
    const filteredAndGroupedProducts = useMemo(() => {
        const filtered = availableProducts.filter(p => 
            p.TenSP.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.reduce((acc, curr) => {
            if (!acc[curr.TenSP]) acc[curr.TenSP] = [];
            acc[curr.TenSP].push(curr);
            return acc;
        }, {});
    }, [availableProducts, searchTerm]);

    // Thao tác đóng/mở Accordion
    const toggleGroupExpand = (productName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [productName]: !prev[productName]
        }));
    };

    const handleSelectAllVariantsOfProduct = (productName, variants) => {
        const variantsOfProduct = variants.map(v => v.MaBienThe);
        const isAllSelected = variantsOfProduct.every(id => selectedVariants.includes(id));

        if (isAllSelected) {
            setSelectedVariants(prev => prev.filter(id => !variantsOfProduct.includes(id)));
        } else {
            setSelectedVariants(prev => Array.from(new Set([...prev, ...variantsOfProduct])));
        }
    };

    const handleCheckboxChange = (maBienThe) => {
        setSelectedVariants(prev => prev.includes(maBienThe) ? prev.filter(id => id !== maBienThe) : [...prev, maBienThe]);
    };

    const handleInputChange = (e) => {
        setNewPromo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddPromotion = async (e) => {
        e.preventDefault();
        if (!newPromo.TenCTKM || !newPromo.GiaTriGiam || !newPromo.NgayBatDau || !newPromo.NgayKetThuc) {
            return toast.warning("Vui lòng điền đầy đủ thông tin!");
        }
        if (selectedVariants.length === 0) {
            return toast.warning("Vui lòng chọn ít nhất 1 sản phẩm!");
        }

        try {
            const payload = { ...newPromo, GiaTriGiam: Number(newPromo.GiaTriGiam), danhSachBienThe: selectedVariants };
            await axiosClient.post('promotions', payload);
            toast.success("Tạo thành công! Đang chuyển hướng...");
            setTimeout(() => navigate('/admin/promotions'), 1500);
        } catch  {
            toast.error("Có lỗi xảy ra!");
        }
    };

    return (
        <div className="promo-dashboard">
            <div className="page-header">
                <div className="header-left-group">
                    {/* <button className="btn-back" onClick={() => navigate('/admin/promotions')}>← Quay lại</button> */}
                    <h1 className="page-title">TẠO CHƯƠNG TRÌNH SALE MỚI</h1>
                </div>
            </div>

            <form onSubmit={handleAddPromotion} className="promo-create-layout">
                <div className="left-column">
                    <div className="form-card">
                        <h3>1. Thông tin chương trình</h3>
                        <div className="form-group">
                            <label>Tên chương trình *</label>
                            <input type="text" name="TenCTKM" value={newPromo.TenCTKM} onChange={handleInputChange} placeholder="VD: Siêu Sale Black Friday" />
                        </div>
                        
                        <div className="form-grid-2 mt-3">
                            <div className="form-group">
                                <label>Loại giảm giá</label>
                                <select name="LoaiGiamGia" value={newPromo.LoaiGiamGia} onChange={handleInputChange}>
                                    <option value="PhanTram">Phần trăm (%)</option>
                                    <option value="SoTien">Số tiền (VNĐ)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mức giảm *</label>
                                <input type="number" name="GiaTriGiam" value={newPromo.GiaTriGiam} onChange={handleInputChange} placeholder="VD: 20" />
                            </div>
                        </div>

                        <div className="form-grid-2 mt-3">
                            <div className="form-group">
                                <label>Ngày bắt đầu *</label>
                                <input type="datetime-local" name="NgayBatDau" value={newPromo.NgayBatDau} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Ngày kết thúc *</label>
                                <input type="datetime-local" name="NgayKetThuc" value={newPromo.NgayKetThuc} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions-left">
                        <button type="button" className="btn-cancel" onClick={() => navigate('/admin/promotions')}>Hủy bỏ</button>
                        <button type="submit" className="btn-submit-large">LƯU CHƯƠNG TRÌNH</button>
                    </div>
                </div>

                <div className="right-column">
                    <div className="form-card product-card-container">
                        <div className="product-header-tools">
                            <h3>2. Sản phẩm áp dụng ({selectedVariants.length} đã chọn)</h3>
                            <button type="button" className="btn-clear-all" onClick={() => setSelectedVariants([])}>
                                Bỏ chọn tất cả
                            </button>
                        </div>

                        {/* THANH TÌM KIẾM */}
                        <div className="product-search-bar">
                            <span className="search-icon">🔍</span>
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm tên sản phẩm..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="product-list-vertical custom-scroll">
                            {Object.entries(filteredAndGroupedProducts).length > 0 ? (
                                Object.entries(filteredAndGroupedProducts).map(([productName, variants]) => {
                                    const selectedCount = variants.filter(v => selectedVariants.includes(v.MaBienThe)).length;
                                    const totalCount = variants.length;
                                    const isAllSelected = selectedCount === totalCount;
                                    const isExpanded = expandedGroups[productName]; // Kiểm tra xem dòng này có đang mở không

                                    return (
                                        <div key={productName} className={`product-group-row ${isExpanded ? 'expanded' : ''}`}>
                                            <div className="product-group-header">
                                                {/* Nhóm mũi tên và Tên SP dùng để gập mở */}
                                                <div className="header-left-toggle" onClick={() => toggleGroupExpand(productName)}>
                                                    <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
                                                </div>

                                                {/* Nhóm checkbox và Tên SP */}
                                                <label className="header-checkbox-group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isAllSelected} 
                                                        onChange={() => handleSelectAllVariantsOfProduct(productName, variants)} 
                                                    />
                                                    <span className="product-name-title" onClick={(e) => {e.preventDefault(); toggleGroupExpand(productName)}}>{productName}</span>
                                                </label>

                                                {/* Bộ đếm thông minh */}
                                                <div className="header-counter">
                                                    <span className={`counter-badge ${selectedCount > 0 ? 'has-selected' : ''}`}>
                                                        {selectedCount}/{totalCount}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Hiển thị Biến thể NẾU isExpanded = true */}
                                            {isExpanded && (
                                                <div className="variants-grid-2-col">
                                                    {variants.map(v => (
                                                        <label key={v.MaBienThe} className="variant-item">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedVariants.includes(v.MaBienThe)} 
                                                                onChange={() => handleCheckboxChange(v.MaBienThe)} 
                                                            />
                                                            <span className="variant-name">{v.TenBienThe}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="empty-search-result">Không tìm thấy sản phẩm nào.</div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default PromotionCreate;