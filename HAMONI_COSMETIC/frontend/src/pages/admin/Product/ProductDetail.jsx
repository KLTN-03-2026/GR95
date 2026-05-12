import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UploadCloud, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';
import './ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const userPermissions = JSON.parse(localStorage.getItem('userPermissions') || '[]');
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    const canDeleteProduct = userInfo?.maQuyen === 'ADMIN' || userPermissions.includes('ALL') || userPermissions.includes('DELETE_PRODUCT');
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [categories, setCategories] = useState([]);

    const [product, setProduct] = useState({});
    const [originalProduct, setOriginalProduct] = useState({});
    const [images, setImages] = useState([]);
    const [variants, setVariants] = useState([]);

    const [newVariant, setNewVariant] = useState({ TenBienThe: '', Gia: '' });

    const [alertConfig, setAlertConfig] = useState({ show: false, type: 'success', message: '' });
    
    // Modal xóa sản phẩm
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // ✅ MỚI: Modal xóa biến thể
    const [showDeleteVariantModal, setShowDeleteVariantModal] = useState(false);
    const [variantToDelete, setVariantToDelete] = useState(null); // { MaBienThe, TenBienThe }

    const showAlert = (message, type = 'success') => {
        setAlertConfig({ show: true, type, message });
        setTimeout(() => {
            setAlertConfig(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const loadData = useCallback(async () => {
        try {
            const catRes = await axiosClient.get('/categories');
            setCategories(catRes.data || catRes || []);

            const res = await axiosClient.get(`/products/${id}`);
            
            const productData = res.info || res.data?.info || {};
            setProduct(productData);
            setOriginalProduct(productData);
            
            setImages(res.images || res.data?.images || []);
            setVariants(res.variants || res.data?.variants || []);

        } catch (error) {
            console.error("Lỗi tải chi tiết:", error);
            showAlert("Không thể tải thông tin sản phẩm này!", "danger");
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
        if (JSON.stringify(product) === JSON.stringify(originalProduct)) {
            return showAlert("Bạn chưa chỉnh sửa thông tin nào của sản phẩm!", "warning");
        }

        setIsSaving(true);
        try {
            await axiosClient.put(`/products/${id}`, product);
            showAlert("Đã lưu thông tin cơ bản thành công!");
            setOriginalProduct(product);
        } catch (error) {
            showAlert("Lỗi khi lưu thông tin!", "danger");
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
            showAlert("Đã thêm ảnh mới thành công!");
        } catch (error) {
            showAlert("Lỗi tải ảnh lên hệ thống!", "danger");
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
            showAlert("Đã xóa ảnh thành công!");
        } catch {
            showAlert("Lỗi khi xóa ảnh!", "danger");
        }
    };

    const handleAddVariant = async () => {
        if (!newVariant.TenBienThe || !newVariant.Gia) {
            return showAlert("Vui lòng nhập đầy đủ tên phân loại và giá bán!", "danger");
        }
        
        try {
            const res = await axiosClient.post(`/products/${id}/variants`, newVariant);
            
            const newVariantId = res.MaBienThe || res.data?.MaBienThe;
            setVariants([...variants, { MaBienThe: newVariantId, ...newVariant }]);
            
            setNewVariant({ TenBienThe: '', Gia: '' }); 
            showAlert("Đã thêm phân loại mới!");
        } catch (error) {
            showAlert("Lỗi thêm biến thể mới!", "danger");
            console.error(error);
        }
    };

    // ✅ MỚI: Bấm nút xóa biến thể -> Hiện Modal thay vì window.confirm
    const handleClickDeleteVariant = (variant) => {
        setVariantToDelete(variant);
        setShowDeleteVariantModal(true);
    };

    // ✅ MỚI: Xác nhận xóa biến thể chính thức
    const confirmDeleteVariant = async () => {
        if (!variantToDelete) return;
        setShowDeleteVariantModal(false);
        try {
            await axiosClient.delete(`/products/variants/${variantToDelete.MaBienThe}`);
            setVariants(variants.filter(v => v.MaBienThe !== variantToDelete.MaBienThe));
            showAlert("Đã xóa phân loại thành công!");
        } catch (error) {
            showAlert("Lỗi xóa biến thể!", "danger");
            console.error(error);
        } finally {
            setVariantToDelete(null);
        }
    };

    const handleClickDeleteProduct = () => {
        if (!canDeleteProduct) {
            showAlert('Bạn không có quyền xóa sản phẩm này!', 'danger');
            return;
        }
        setShowDeleteModal(true);
    };

    const confirmDeleteProduct = async () => {
        setShowDeleteModal(false);
        try {
            await axiosClient.delete(`/products/${id}`);
            showAlert('Đã xóa sản phẩm thành công!');
            setTimeout(() => navigate('/admin/products'), 1000);
        } catch (error) {
            const msg = error?.response?.data?.message || 'Lỗi xóa sản phẩm!';
            showAlert(msg, 'danger');
            console.error(error);
        }
    };

    if (loading) return <div className="p-5 text-center fw-bold text-muted mt-5">Đang tải dữ liệu sản phẩm...</div>;

    return (
        <div className="product-detail-container">
            <div className="detail-header">
                <div className="d-flex align-items-center gap-3">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="m-0 fw-bold"> {String(product.TenSP || '')}</h2>
                </div>
                {canDeleteProduct && (
                    <button className="btn btn-danger d-flex align-items-center gap-2" onClick={handleClickDeleteProduct}>
                        <Trash2 size={16} /> Xóa sản phẩm
                    </button>
                )}
            </div>

            <div className="detail-layout">
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
                        <div className="save-action-bar">
                            <button className="btn-save-primary" onClick={handleSaveInfo} disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi thông tin'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="right-col">
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

                            {images.map((img) => (
                                <div key={img.MaHinhAnh} className="image-item">
                                    <img src={img.DuongDanAnh} alt="product" />
                                    <button className="btn-delete-img" onClick={() => handleDeleteImage(img.MaHinhAnh)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="detail-card mt-4">
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
                                                    {/* ✅ Gọi handleClickDeleteVariant thay vì handleDeleteVariant trực tiếp */}
                                                    <button className="btn-delete-variant-mini" onClick={() => handleClickDeleteVariant(v)}>
                                                        <Trash2 size={14}/>
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

            {/* --- MODAL XÁC NHẬN XÓA SẢN PHẨM --- */}
            {showDeleteModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title text-danger fw-bold d-flex align-items-center gap-2">
                                    <AlertCircle size={24} /> Xác nhận xóa sản phẩm
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body py-4">
                                <p className="mb-0 fs-6">
                                    Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm <strong className="text-dark">{product.TenSP}</strong> không?<br/>
                                    <span className="text-muted" style={{fontSize: '14px'}}>Hành động này không thể hoàn tác và sẽ xóa toàn bộ ảnh, phân loại liên quan.</span>
                                </p>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button type="button" className="btn btn-light" onClick={() => setShowDeleteModal(false)}>Hủy bỏ</button>
                                <button type="button" className="btn btn-danger px-4" onClick={confirmDeleteProduct}>Xóa vĩnh viễn</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ MỚI: MODAL XÁC NHẬN XÓA BIẾN THỂ --- */}
            {showDeleteVariantModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title text-danger fw-bold d-flex align-items-center gap-2">
                                    <AlertCircle size={24} /> Xác nhận xóa phân loại
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteVariantModal(false)}></button>
                            </div>
                            <div className="modal-body py-4">
                                <p className="mb-0 fs-6">
                                    Bạn có chắc chắn muốn xóa phân loại <strong className="text-dark">{variantToDelete?.TenBienThe}</strong> không?<br/>
                                    <span className="text-muted" style={{fontSize: '14px'}}>Xóa biến thể này sẽ ảnh hưởng đến đơn hàng nếu đã có người mua. Hành động này không thể hoàn tác.</span>
                                </p>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button type="button" className="btn btn-light" onClick={() => setShowDeleteVariantModal(false)}>Hủy bỏ</button>
                                <button type="button" className="btn btn-danger px-4" onClick={confirmDeleteVariant}>Xóa phân loại</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BOOTSTRAP TOAST --- */}
            {alertConfig.show && (
                <div className="toast-container position-fixed top-0 end-0 p-4" style={{ zIndex: 9999 }}>
                    <div className="toast show border-0 shadow-lg" style={{ 
                        borderRadius: '12px', minWidth: '320px', overflow: 'hidden',
                        backgroundColor: alertConfig.type === 'success' ? '#8ceca8' : (alertConfig.type === 'warning' ? '#fff3cd' : '#fdecea'),
                        borderLeft: `6px solid ${alertConfig.type === 'success' ? '#28a745' : (alertConfig.type === 'warning' ? '#ffc107' : '#dc3545')}`
                    }}>
                        <div className="d-flex align-items-center p-3">
                            <div className={`me-3 text-${alertConfig.type === 'success' ? 'success' : (alertConfig.type === 'warning' ? 'warning' : 'danger')}`}>
                                {alertConfig.type === 'success' ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                            </div>
                            <div className="flex-grow-1">
                                <span className="fw-bold" style={{ 
                                    fontSize: '15px', 
                                    color: alertConfig.type === 'success' ? '#1e4620' : (alertConfig.type === 'warning' ? '#664d03' : '#611a15') 
                                }}>
                                    {alertConfig.message}
                                </span>
                            </div>
                            <button type="button" className="btn-close ms-2" onClick={() => setAlertConfig({ ...alertConfig, show: false })}></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDetail;