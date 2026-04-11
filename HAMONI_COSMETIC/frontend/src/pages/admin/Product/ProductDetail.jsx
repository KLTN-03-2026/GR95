import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UploadCloud, Trash2, Plus } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [categories, setCategories] = useState([]);

    const [product, setProduct] = useState({});
    const [images, setImages] = useState([]);
    const [variants, setVariants] = useState([]);

    const [newVariant, setNewVariant] = useState({ TenBienThe: '', Gia: '' });

    const loadData = useCallback(async () => {
        try {
            const catRes = await axiosClient.get('/categories');
            setCategories(catRes.data || catRes || []);

            const res = await axiosClient.get(`/products/${id}`);
            
            setProduct(res.info || res.data?.info || {});
            setImages(res.images || res.data?.images || []);
            setVariants(res.variants || res.data?.variants || []);

        } catch (error) {
            console.error("Lỗi tải chi tiết:", error);
            alert("Không thể tải thông tin sản phẩm này!");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInfoChange = (e) => {
        setProduct({ ...product, [e.target.name]: e.target.value });
    };

    const handleSaveInfo = async () => {
        setIsSaving(true);
        try {
            await axiosClient.put(`/products/${id}`, product);
            alert("Đã lưu thông tin cơ bản thành công!");
        } catch (error) {
            alert("Lỗi khi lưu thông tin!");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setIsUploading(true);

        try {
            const uploadRes = await axiosClient.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const dbRes = await axiosClient.post(`/products/${id}/images`, { 
                DuongDanAnh: uploadRes.url 
            });
            
            const newImageId = dbRes.MaHinhAnh || dbRes.data?.MaHinhAnh;
            setImages([...images, { MaHinhAnh: newImageId, DuongDanAnh: uploadRes.url }]);
            
        } catch (error) {
            alert("Lỗi tải ảnh lên hệ thống!");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteImage = async (imageId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này?")) return;
        try {
            await axiosClient.delete(`/products/images/${imageId}`);
            setImages(images.filter(img => img.MaHinhAnh !== imageId));
        } catch {
            alert("Lỗi khi xóa ảnh!");
        }
    };

    const handleAddVariant = async () => {
        if (!newVariant.TenBienThe || !newVariant.Gia) {
            return alert("Vui lòng nhập đầy đủ tên phân loại và giá bán!");
        }
        
        try {
            const res = await axiosClient.post(`/products/${id}/variants`, newVariant);
            
            const newVariantId = res.MaBienThe || res.data?.MaBienThe;
            setVariants([...variants, { MaBienThe: newVariantId, ...newVariant }]);
            
            setNewVariant({ TenBienThe: '', Gia: '' }); 
        } catch (error) {
            alert("Lỗi thêm biến thể mới!");
            console.error(error);
        }
    };

    const handleDeleteVariant = async (variantId) => {
        if (!window.confirm("Xóa biến thể này sẽ ảnh hưởng đến đơn hàng nếu đã có người mua. Bạn có chắc chắn?")) return;
        try {
            await axiosClient.delete(`/products/variants/${variantId}`);
            setVariants(variants.filter(v => v.MaBienThe !== variantId));
        } catch (error) {
            alert("Lỗi xóa biến thể! Có thể nó đang bị ràng buộc với dữ liệu tồn kho hoặc đơn hàng.");
            console.error(error);
        }
    };

    if (loading) return <div className="p-5 text-center fw-bold text-muted mt-5">Đang tải dữ liệu sản phẩm...</div>;

    return (
        <div className="product-detail-container">
            {/* HEADER - Đã bỏ nút Lưu ở đây */}
            <div className="detail-header">
                <div className="d-flex align-items-center gap-3">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="m-0 fw-bold">CHI TIẾT SẢN PHẨM: {String(product.TenSP || '').padStart(3, '0')}</h2>
                </div>
            </div>

            <div className="detail-layout">
                {/* CỘT TRÁI: THÔNG TIN CƠ BẢN */}
                <div className="left-col">
                    <div className="detail-card">
                        <h5 className="card-title">Thông tin cơ bản</h5>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Tên sản phẩm mỹ phẩm</label>
                                <input type="text" name="TenSP" value={product.TenSP || ''} onChange={handleInfoChange} />
                            </div>
                            <div className="form-group">
                                <label>Danh mục</label>
                                <select name="MaDM" value={product.MaDM || ''} onChange={handleInfoChange}>
                                    {categories.map(c => <option key={c.MaDM} value={c.MaDM}>{c.TenDM}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Loại da phù hợp</label>
                                <input type="text" name="LoaiDaPhuHop" value={product.LoaiDaPhuHop || ''} onChange={handleInfoChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Mô tả chi tiết</label>
                                <textarea name="MoTa" rows="6" value={product.MoTa || ''} onChange={handleInfoChange}></textarea>
                            </div>
                            <div className="form-group full-width">
                                <label>Thành phần chính</label>
                                <input type="text" name="ThanhPhan" value={product.ThanhPhan || ''} onChange={handleInfoChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Cách sử dụng</label>
                                <input type="text" name="CachSuDung" value={product.CachSuDung || ''} onChange={handleInfoChange} />
                            </div>
                        </div>

                        {/* 🔥 NÚT LƯU ĐÃ ĐƯỢC CHUYỂN XUỐNG ĐÂY 🔥 */}
                        <div className="save-action-bar">
                            <button className="btn-save-primary" onClick={handleSaveInfo} disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi thông tin'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: HÌNH ẢNH + BIẾN THỂ */}
                <div className="right-col">
                    
                    {/* KHỐI 1: THƯ VIỆN ẢNH */}
                    <div className="detail-card">
                        <h5 className="card-title mb-3">Thư viện ảnh</h5>
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

                            {/* Đã sửa lỗi che khuất icon xóa ảnh */}
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
                                                        <Trash2/>
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

export default ProductDetail;