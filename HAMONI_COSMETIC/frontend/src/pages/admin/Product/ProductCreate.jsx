import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UploadCloud, Trash2, Plus } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';
import './ProductDetail.css'; // Dùng chung CSS với trang Detail luôn cho đồng bộ!

const ProductCreate = () => {
    const navigate = useNavigate();
    
    //const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [categories, setCategories] = useState([]);

    // --- STATE QUẢN LÝ 3 KHỐI DỮ LIỆU CHỜ ĐỂ LƯU ---
    const [product, setProduct] = useState({
        TenSP: '', MaDM: '', LoaiDaPhuHop: '', MoTa: '', ThanhPhan: '', CachSuDung: ''
    });
    
    // Lưu tạm hình ảnh và biến thể ở Frontend trước khi bấm "Lưu"
    const [images, setImages] = useState([]); 
    const [variants, setVariants] = useState([]);

    const [newVariant, setNewVariant] = useState({ TenBienThe: '', Gia: '' });

    // ==========================================
    // 1. TẢI DANH MỤC BAN ĐẦU
    // ==========================================
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const catRes = await axiosClient.get('/categories');
                const catData = catRes.data || catRes || [];
                setCategories(catData);
                // Gán mặc định danh mục đầu tiên nếu có
                if (catData.length > 0) {
                    setProduct(prev => ({ ...prev, MaDM: catData[0].MaDM }));
                }
            } catch (error) {
                console.error("Lỗi tải danh mục:", error);
            }
        };
        loadCategories();
    }, []);

    // ==========================================
    // 2. XỬ LÝ NHẬP THÔNG TIN CƠ BẢN
    // ==========================================
    const handleInfoChange = (e) => {
        setProduct({ ...product, [e.target.name]: e.target.value });
    };

    // ==========================================
    // 3. XỬ LÝ HÌNH ẢNH (CHỈ LƯU TẠM VÀO STATE)
    // ==========================================
    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setIsUploading(true);

        try {
            // Đẩy lên Cloudinary lấy Link tạm
            const uploadRes = await axiosClient.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Lưu link vào State tạm, chưa lưu DB
            const tempId = Date.now(); // Tạo ID giả để render
            setImages([...images, { MaHinhAnh: tempId, DuongDanAnh: uploadRes.url }]);
            
        } catch (error) {
            alert("Lỗi tải ảnh lên hệ thống!");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteImage = (imageId) => {
        setImages(images.filter(img => img.MaHinhAnh !== imageId));
    };

    // ==========================================
    // 4. XỬ LÝ BIẾN THỂ (CHỈ LƯU TẠM VÀO STATE)
    // ==========================================
    const handleAddVariant = () => {
        if (!newVariant.TenBienThe || !newVariant.Gia) {
            return alert("Vui lòng nhập đầy đủ tên phân loại và giá bán!");
        }
        
        const tempId = Date.now(); // Tạo ID giả
        setVariants([...variants, { MaBienThe: tempId, ...newVariant }]);
        setNewVariant({ TenBienThe: '', Gia: '' }); 
    };

    const handleDeleteVariant = (variantId) => {
        setVariants(variants.filter(v => v.MaBienThe !== variantId));
    };

    // ==========================================
    // 5. LƯU TOÀN BỘ DỮ LIỆU XUỐNG DATABASE
    // ==========================================
    const handleSaveNewProduct = async () => {
        if (!product.TenSP || !product.MaDM) {
            return alert("Vui lòng nhập Tên sản phẩm và chọn Danh mục!");
        }

        setIsSaving(true);
        try {
            // Chuẩn bị cục Data khổng lồ gom cả 3 thứ
            const payload = {
                productInfo: product,
                images: images.map(img => img.DuongDanAnh), // Chỉ gửi mảng Link
                variants: variants.map(v => ({ TenBienThe: v.TenBienThe, Gia: v.Gia })) // Bỏ ID giả
            };

            // Gọi API Tạo Mới (Đã viết ở bài trước)
            await axiosClient.post('/products', payload);
            
            alert("Tạo sản phẩm mới thành công!");
            navigate('/admin/products'); // Quay về danh sách

        } catch (error) {
            alert("Lỗi khi lưu sản phẩm mới!");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="product-detail-container">
            {/* HEADER */}
            <div className="detail-header">
                <div className="d-flex align-items-center gap-3">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="m-0 fw-bold text-success">THÊM SẢN PHẨM MỚI</h2>
                </div>
            </div>

            <div className="detail-layout">
                {/* CỘT TRÁI: THÔNG TIN CƠ BẢN */}
                <div className="left-col">
                    <div className="detail-card">
                        <h5 className="card-title">Thông tin cơ bản</h5>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Tên sản phẩm mỹ phẩm <span className="text-danger">*</span></label>
                                <input type="text" name="TenSP" value={product.TenSP} onChange={handleInfoChange} placeholder="Nhập tên sản phẩm..." />
                            </div>
                            <div className="form-group">
                                <label>Danh mục <span className="text-danger">*</span></label>
                                <select name="MaDM" value={product.MaDM} onChange={handleInfoChange}>
                                    <option value="" disabled>-- Chọn danh mục --</option>
                                    {categories.map(c => <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Loại da phù hợp</label>
                                <input type="text" name="LoaiDaPhuHop" value={product.LoaiDaPhuHop} onChange={handleInfoChange} placeholder="VD: Mọi loại da..." />
                            </div>
                            <div className="form-group full-width">
                                <label>Mô tả chi tiết</label>
                                <textarea name="MoTa" rows="6" value={product.MoTa} onChange={handleInfoChange} placeholder="Nhập mô tả sản phẩm..."></textarea>
                            </div>
                            <div className="form-group full-width">
                                <label>Thành phần chính</label>
                                <input type="text" name="ThanhPhan" value={product.ThanhPhan} onChange={handleInfoChange} placeholder="VD: ZinC, Vitamin C..." />
                            </div>
                            <div className="form-group full-width">
                                <label>Cách sử dụng</label>
                                <input type="text" name="CachSuDung" value={product.CachSuDung} onChange={handleInfoChange} placeholder="Hướng dẫn sử dụng..." />
                            </div>
                        </div>

                        {/* NÚT LƯU ĐẶT Ở CUỐI CÙNG */}
                        <div className="save-action-bar">
                            <button className="btn-save-primary" onClick={handleSaveNewProduct} disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Đang tạo...' : 'Lưu sản phẩm mới'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: HÌNH ẢNH + BIẾN THỂ */}
                <div className="right-col d-flex flex-column gap-4">
                    
                    {/* KHỐI 1: THƯ VIỆN ẢNH */}
                    <div className="detail-card">
                        <h5 className="card-title mb-3">Thư viện ảnh</h5>
                        {/* <p className="text-muted mb-3" style={{fontSize: '12px'}}>
                            Lưu ý: Ảnh sẽ được lưu cùng sản phẩm khi bạn bấm "Lưu sản phẩm mới".
                        </p> */}
                        <div className="image-gallery-grid">
                            <label className={`upload-card ${isUploading ? 'loading' : ''}`}>
                                {isUploading ? (
                                    <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
                                ) : (
                                    <>
                                        <UploadCloud size={24} className="mb-2 text-muted" />
                                        <span>Thêm ảnh</span>
                                    </>
                                )}
                                <input type="file" hidden accept="image/*" onChange={handleUploadImage} disabled={isUploading} />
                            </label>

                            {images.map((img) => (
                                <div key={img.MaHinhAnh} className="image-item">
                                    <img src={img.DuongDanAnh} alt="product" />
                                    <button className="btn-delete-img" onClick={() => handleDeleteImage(img.MaHinhAnh)} title="Xóa ảnh này">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* KHỐI 2: BIẾN THỂ SẢN PHẨM */}
                    <div className="detail-card">
                        <h5 className="card-title mb-3">Phân loại & Giá bán</h5>
                        
                        <div className="add-variant-compact">
                            <input 
                                type="text" 
                                className="variant-name-input"
                                placeholder="Tên phân loại..." 
                                value={newVariant.TenBienThe}
                                onChange={(e) => setNewVariant({...newVariant, TenBienThe: e.target.value})}
                            />
                            <input 
                                type="number" 
                                className="variant-price-input"
                                placeholder="Giá bán (VNĐ)" 
                                value={newVariant.Gia}
                                onChange={(e) => setNewVariant({...newVariant, Gia: e.target.value})}
                            />
                            <button className="btn-add-variant" onClick={handleAddVariant}>
                                <Plus size={16} /> Thêm
                            </button>
                        </div>

                        <div className="table-responsive mt-3">
                            <table className="variant-table w-100">
                                <thead>
                                    <tr>
                                        <th style={{textAlign: 'left'}}>PHÂN LOẠI</th>
                                        <th style={{textAlign: 'left'}}>GIÁ BÁN</th>
                                        <th style={{textAlign: 'right'}}>XÓA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variants.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-4 text-muted">Chưa có phân loại.</td></tr>
                                    ) : (
                                        variants.map((v) => (
                                            <tr key={v.MaBienThe}>
                                                <td className="fw-medium text-start">{v.TenBienThe}</td>
                                                <td className="fw-bold text-danger text-nowrap text-start">
                                                    {Number(v.Gia).toLocaleString('vi-VN')}đ
                                                </td>
                                                <td style={{textAlign: 'right'}}>
                                                    <button className="btn-delete-variant-mini" onClick={() => handleDeleteVariant(v.MaBienThe)} title="Xóa phân loại">
                                                        <Trash2 />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProductCreate;