import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { bannerApi } from '../../../services/bannerApi';
import axios from 'axios';

const BannerForm = ({ isOpen, onClose, data, onSuccess }) => {
    // 1. State Management
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [preview, setPreview] = useState(''); 
    const [selectedFile, setSelectedFile] = useState(null); 
    const [errors, setErrors] = useState({}); // THÊM: State quản lý lỗi

    const editingId = data?.MaBanner;
    
    const [formValues, setFormValues] = useState({
        TieuDe: '',
        URLDich: '',
        ViTriHienThi: 'TrangChu',
        ThuTuHienThi: 0,
        TrangThai: 'Active',
        NgayBatDau: '',
        NgayHetHan: ''
    });

    // 2. Sync Data & Cleanup
    useEffect(() => {
        if (isOpen) {
            const initialPreview = data?.DuongDanAnh || '';
            
            if (preview !== initialPreview) {
                setPreview(initialPreview);
            }

            if (data) {
                setFormValues({
                    TieuDe: data.TieuDe || '',
                    URLDich: data.URLDich || '',
                    ViTriHienThi: data.ViTriHienThi || 'TrangChu',
                    ThuTuHienThi: data.ThuTuHienThi || 0,
                    TrangThai: data.TrangThai || 'Active',
                    NgayBatDau: toDateInputValue(data.NgayBatDau),
                    NgayHetHan: toDateInputValue(data.NgayHetHan)
                });
            } else {
                // Reset form nếu là thêm mới
                setFormValues({
                    TieuDe: '',
                    URLDich: '',
                    ViTriHienThi: 'TrangChu',
                    ThuTuHienThi: 0,
                    TrangThai: 'Active',
                    NgayBatDau: '',
                    NgayHetHan: ''
                });
            }

            setSelectedFile(null);
            setAlert({ show: false, type: '', message: '' });
            setErrors({}); // Xóa hết lỗi cũ khi mở form
        }
        
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.DuongDanAnh, isOpen]);

    if (!isOpen) return null;

    // 3. Hàm kiểm tra hợp lệ (Validation)
    const validateForm = () => {
        let newErrors = {};
        
        // Kiểm tra Tiêu đề
        if (!formValues.TieuDe || formValues.TieuDe.trim() === '') {
            newErrors.TieuDe = 'Vui lòng nhập tiêu đề chiến dịch';
        }

        // Kiểm tra Ảnh (Bắt buộc nếu là thêm mới hoặc không có ảnh cũ)
        if (!editingId && !selectedFile && !preview) {
            newErrors.image = 'Vui lòng chọn hình ảnh cho banner';
        }

        if (formValues.NgayBatDau && formValues.NgayHetHan && formValues.NgayBatDau > formValues.NgayHetHan) {
            newErrors.NgayBatDau = 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày hết hạn';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Trả về true nếu không có lỗi
    };

    // 4. Xử lý khi chọn File
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }

            setSelectedFile(file);
            setPreview(URL.createObjectURL(file)); 
            
            // Xóa báo lỗi ảnh nếu người dùng đã chọn
            if (errors.image) setErrors({ ...errors, image: null });
        }
    };
    
    // 5. Gửi dữ liệu lên Server
    const handleSubmit = async (e) => {
        e.preventDefault();

        // GỌI HÀM KIỂM TRA: Nếu có lỗi thì dừng lại luôn
        if (!validateForm()) {
            return; 
        }

        try {
            let urlToSave = preview; 

            if (selectedFile) {
                const fileToUpload = await prepareImageForUpload(selectedFile);
                const formData = new FormData();
                formData.append('image', fileToUpload);

                const uploadRes = await axios.post('http://localhost:5000/api/upload', formData);
                urlToSave = uploadRes.data.url; 
            }

            const dataToSend = {
                ...formValues,
                DuongDanAnh: urlToSave 
            };

            if (editingId) {
                await bannerApi.update(editingId, dataToSend);
            } else {
                await bannerApi.create(dataToSend);
            }

            onSuccess(editingId ? 'Cập nhật banner thành công' : 'Thêm banner mới thành công');
            onClose();
        } catch (error) {
            const apiMessage = error?.response?.data?.message || error?.response?.data?.error;
            setAlert({ show: true, type: 'danger', message: "Lỗi khi lưu: " + (apiMessage || error.message) });
        }
    };

    return createPortal(
        <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
        >
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '100%', maxWidth: '550px' }}>
                
                {/* Header */}
                <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">
                    <h5 className="fw-bold m-0" style={{ color: '#81802E' }}>
                        {editingId ? "CẬP NHẬT BANNER" : "THÊM BANNER MỚI"}
                    </h5>
                    <X style={{ cursor: 'pointer', color: '#777' }} onClick={onClose} />
                </div>

                <div className="card-body px-4 pb-4">
                    {alert.show && (
                        <div className={`alert alert-${alert.type} d-flex align-items-center p-3 mb-4`} role="alert">
                            {alert.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <AlertCircle size={20} className="me-2" />}
                            <div className="fw-medium" style={{ fontSize: '15px' }}>{alert.message}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* Tiêu đề chiến dịch */}
                        <div className="mb-3">
                            <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                Tiêu đề chiến dịch <span className="text-danger">*</span>
                            </label>
                            <input 
                                type="text"
                                className={`form-control bg-light ${errors.TieuDe ? 'is-invalid border-danger' : 'border-0'}`}
                                value={formValues.TieuDe}
                                onChange={(e) => {
                                    setFormValues({ ...formValues, TieuDe: e.target.value });
                                    // Xóa lỗi khi bắt đầu gõ
                                    if (errors.TieuDe) setErrors({ ...errors, TieuDe: null }); 
                                }}
                            />
                            {/* Hiển thị lỗi Tiêu đề */}
                            {errors.TieuDe && <div className="text-danger mt-1" style={{ fontSize: '13px' }}>{errors.TieuDe}</div>}
                        </div>

                        {/* Upload & Preview Ảnh */}
                        <div className="mb-3">
                            <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                Hình ảnh banner {(!editingId) && <span className="text-danger">*</span>}
                            </label>
                            <div className="d-flex flex-column gap-2">
                                <div className="input-group">
                                    <label className={`input-group-text bg-light ${errors.image ? 'border-danger' : 'border-0'}`} htmlFor="upload-banner" style={{ cursor: 'pointer' }}>
                                        <Upload size={18} className={errors.image ? 'text-danger' : ''} />
                                    </label>
                                    <input 
                                        id="upload-banner"
                                        type="file" 
                                        className="d-none"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <div 
                                        className={`form-control bg-light text-muted d-flex align-items-center ${errors.image ? 'is-invalid border-danger' : 'border-0'}`}
                                        onClick={() => document.getElementById('upload-banner').click()}
                                        style={{ cursor: 'pointer', fontSize: '14px' }}
                                    >
                                        {selectedFile ? selectedFile.name : (data?.DuongDanAnh ? "Đã có ảnh (Click để thay đổi)" : "Chọn ảnh từ máy tính...")}
                                    </div>
                                </div>
                                
                                {/* Hiển thị lỗi Hình ảnh */}
                                {errors.image && <div className="text-danger" style={{ fontSize: '13px' }}>{errors.image}</div>}
                                
                                {preview && (
                                    <div className="rounded-3 border overflow-hidden bg-white d-flex justify-content-center align-items-center mt-2" style={{ height: '180px' }}>
                                        <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Link và Vị trí */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Link đích (URLDich)</label>
                                <input 
                                    value={formValues.URLDich}
                                    className="form-control bg-light border-1 py-2 px-3 rounded-3"
                                    type="text"
                                    onChange={(e) => setFormValues({ ...formValues, URLDich: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Vị trí hiển thị</label>
                                <select
                                    className="form-select bg-light border-1 py-2 px-3 rounded-3"
                                    value={formValues.ViTriHienThi}
                                    onChange={(e) => setFormValues({ ...formValues, ViTriHienThi: e.target.value })}
                                >
                                    <option value="TrangChu">Trang chủ</option>
                                    <option value="Sidebar">Sidebar</option>
                                    <option value="Popup">Popup</option>
                                </select>
                            </div>
                        </div>

                        {/* Thứ tự và Trạng thái */}
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Thứ tự</label>
                                <input
                                    type="number"
                                    className="form-control bg-light border-1 py-2 px-3 rounded-3"
                                    value={formValues.ThuTuHienThi}
                                    onChange={(e) => setFormValues({ ...formValues, ThuTuHienThi: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Trạng thái</label>
                                <select
                                    value={formValues.TrangThai}
                                    className="form-select bg-light border-1 py-2 px-3 rounded-3"
                                    onChange={(e) => setFormValues({ ...formValues, TrangThai: e.target.value })}
                                >
                                    <option value="Active">Đang hiển thị</option>
                                    <option value="Hidden">Tạm ẩn</option>
                                </select>
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                    Ngày bắt đầu
                                </label>
                                <input
                                    type="date"
                                    className={`form-control bg-light border-1 py-2 px-3 rounded-3 ${errors.NgayBatDau ? 'is-invalid border-danger' : ''}`}
                                    value={formValues.NgayBatDau}
                                    onChange={(e) => {
                                        setFormValues({ ...formValues, NgayBatDau: e.target.value });
                                        if (errors.NgayBatDau) setErrors({ ...errors, NgayBatDau: null });
                                    }}
                                />
                                {errors.NgayBatDau && (
                                    <div className="text-danger mt-1" style={{ fontSize: '13px' }}>
                                        {errors.NgayBatDau}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                    Ngày hết hạn
                                </label>
                                <input
                                    type="date"
                                    className="form-control bg-light border-1 py-2 px-3 rounded-3"
                                    value={formValues.NgayHetHan}
                                    onChange={(e) => setFormValues({ ...formValues, NgayHetHan: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-text mb-2">
                            {`Hiển thị: Bắt đầu: ${formatDateDisplay(formValues.NgayBatDau)} - Hết hạn: ${formatDateDisplay(formValues.NgayHetHan)}`}
                        </div>
                        <div className="form-text">Để trống nếu banner không giới hạn thời gian.</div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-3">
                            <button type="button" className="btn btn-light flex-grow-1 border-0 fw-semibold" onClick={onClose}>
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

function toDateInputValue(dateValue) {
    if (!dateValue) return '';

    if (typeof dateValue === 'string') {
        const rawDate = dateValue.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            return rawDate;
        }
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateInputValue) {
    if (!dateInputValue) return 'Chưa đặt';

    const parts = String(dateInputValue).split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }

    return dateInputValue;
}

async function prepareImageForUpload(file) {
    const maxDirectUploadSize = 2 * 1024 * 1024; // 2MB

    if (!file || file.size <= maxDirectUploadSize) {
        return file;
    }

    try {
        const image = await loadImage(file);
        const maxDimension = 1200;
        const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) return file;

        context.drawImage(image, 0, 0, width, height);

        const compressedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.82);
        if (!compressedBlob) return file;

        const compressedName = (file.name || 'banner').replace(/\.[^.]+$/, '.jpg');
        return new File([compressedBlob], compressedName, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = reader.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
}
    
export default BannerForm;