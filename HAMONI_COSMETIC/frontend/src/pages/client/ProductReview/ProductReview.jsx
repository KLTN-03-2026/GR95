import React, { useEffect, useState } from 'react';
import './ProductReview.css';
import 'react-toastify/dist/ReactToastify.css';
import { createReview } from '../../../services/productreviewApi';
import productApi from '../../../services/productApi';
import { ToastContainer, toast } from 'react-toastify';

const ProductReview = ({ MaSP, MaDH, MaND, productName, productImage, trangThaiDonHang, alreadyReviewed = false }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [previews, setPreviews] = useState([]);
  const [checkingReview, setCheckingReview] = useState(alreadyReviewed ? false : true);
  
  // SỬA Ở ĐÂY: Thay isSubmitted bằng formStatus để chia 3 màn hình rõ ràng
  const [formStatus, setFormStatus] = useState(alreadyReviewed ? 'duplicate' : 'idle'); // 'idle' | 'success' | 'duplicate'

  useEffect(() => {
    if (alreadyReviewed) {
      setFormStatus('duplicate');
      setCheckingReview(false);
      return;
    }

    const getCurrentMaND = () => {
      if (MaND) return MaND;
      const userDataString = localStorage.getItem('user') || localStorage.getItem('userInfo');
      if (!userDataString) return null;
      try {
        const userData = JSON.parse(userDataString);
        return userData.MaND || userData.id || userData.MaKhachHang || null;
      } catch (error) {
        console.error('Lỗi đọc user từ localStorage:', error);
        return null;
      }
    };

    const checkReviewExists = async () => {
      const currentMaND = getCurrentMaND();
      if (!MaSP || !currentMaND) {
        setCheckingReview(false);
        return;
      }

      try {
        setCheckingReview(true);
        const response = await productApi.getProductReviews(MaSP, { limit: 1000 });
        const reviews = Array.isArray(response) ? response : [];
        const hasReviewed = reviews.some((review) => String(review.MaND) === String(currentMaND));
        if (hasReviewed) {
          setFormStatus('duplicate');
        }
      } catch (error) {
        console.warn('Không thể kiểm tra review đã tồn tại:', error);
      } finally {
        setCheckingReview(false);
      }
    };

    checkReviewExists();
  }, [MaSP, MaND, alreadyReviewed]);

  // 1. Hàm xử lý giới hạn TỐI ĐA 5 ẢNH và 5 VIDEO
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    // Đếm số lượng ảnh và video HIỆN TẠI đang có trong giỏ
    let currentImagesCount = selectedFiles.filter(f => f.type.startsWith('image/')).length;
    let currentVideosCount = selectedFiles.filter(f => f.type.startsWith('video/')).length;

    const allowedFiles = [];
    const allowedPreviews = [];
    let imageLimitExceeded = false;
    let videoLimitExceeded = false;

    newFiles.forEach(file => {
      // Nếu là ẢNH
      if (file.type.startsWith('image/')) {
        if (currentImagesCount < 5) {
          allowedFiles.push(file);
          allowedPreviews.push({ url: URL.createObjectURL(file), type: file.type });
          currentImagesCount++;
        } else {
          imageLimitExceeded = true;
        }
      } 
      // Nếu là VIDEO
      else if (file.type.startsWith('video/')) {
        if (currentVideosCount < 5) {
          allowedFiles.push(file);
          allowedPreviews.push({ url: URL.createObjectURL(file), type: file.type });
          currentVideosCount++;
        } else {
          videoLimitExceeded = true;
        }
      }
    });

    // Báo lỗi nếu chọn lố
    if (imageLimitExceeded) toast.error("Bạn chỉ được tải lên tối đa 5 ảnh!");
    if (videoLimitExceeded) toast.error("Bạn chỉ được tải lên tối đa 5 video!");

    // Cập nhật danh sách file hợp lệ
    if (allowedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...allowedFiles]);
      setPreviews(prev => [...prev, ...allowedPreviews]);
    }

    // Reset lại ô input để khách có thể chọn lại file vừa xóa
    e.target.value = null;
  };

  const removeFile = (index) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (trangThaiDonHang && trangThaiDonHang !== 'HoanThanh') {
      toast.error("Bạn chỉ có thể đánh giá sau khi nhận hàng thành công!");
      return;
    }

    if (rating === 0) {
      toast.error("Vui lòng chọn số sao đánh giá!");
      return;
    }

    // Kiểm tra dung lượng từng file (Tối đa 5MB)
    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].size > 5 * 1024 * 1024) { 
        toast.error(`File "${selectedFiles[i].name}" quá lớn. Tối đa 5MB!`);
        return;
      }
    }

    const loadingToast = toast.loading("Đang gửi đánh giá...");

    let realMaND = MaND; 
    if (!realMaND) {
      const userDataString = localStorage.getItem('user') || localStorage.getItem('userInfo'); 
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          realMaND = userData.MaND || userData.id || userData.MaKhachHang; 
        } catch (error) {
          console.error("Lỗi đọc dữ liệu user từ Local Storage:", error);
        }
      }
    }

    if (!realMaND) {
      toast.dismiss(loadingToast);
      toast.error("Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập!");
      return; 
    }

    // Validate IDs before sending — don't fall back to unsafe defaults
    if (!MaSP) {
      toast.dismiss(loadingToast);
      toast.error("Không tìm thấy thông tin sản phẩm. Vui lòng thử lại.");
      return;
    }
    if (!MaDH) {
      toast.dismiss(loadingToast);
      toast.error("Không tìm thấy mã đơn hàng. Vui lòng thử lại.");
      return;
    }

    const formData = new FormData();
    formData.append("MaND", realMaND);
    formData.append("MaSP", MaSP);
    formData.append("MaDH", MaDH);

    // Debug: ensure correct IDs and rating are sent
    console.log('Submitting review', { realMaND, MaSP, MaDH, rating });
    formData.append("SoSao", rating);
    formData.append("BinhLuan", comment);
    
    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file) => {
        formData.append("HinhAnh", file); 
      });
    }

    try {
      const response = await createReview(formData);
      toast.dismiss(loadingToast);

      if (response.success || response.data?.success || response.status === 201) {
        toast.success("Đánh giá thành công! Cảm ơn bạn.");
        
        // CẬP NHẬT TRẠNG THÁI: THÀNH CÔNG
        setFormStatus('success');
        
      } else {
        toast.error(response.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Lỗi submit:", error);
      
      // Nếu Backend báo lỗi đã đánh giá rồi (chặn từ DB)
      const errorMessage = error?.response?.data?.message || "";
      if (errorMessage.includes("đã được bạn đánh giá") || errorMessage.includes("đã đánh giá")) {
        toast.error("Bạn đã đánh giá sản phẩm này rồi!");
        
        // CẬP NHẬT TRẠNG THÁI: BỊ TRÙNG (ĐÃ ĐÁNH GIÁ)
        setFormStatus('duplicate'); 
      } else {
        toast.error(errorMessage || "Lỗi kết nối đến máy chủ.");
      }
    }
  };

  if (checkingReview) {
    return (
      <div className="product-review-wrapper">
        <ToastContainer position="top-center" autoClose={3000} theme="colored" />
        <div className="review-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Đang kiểm tra đánh giá...</h2>
          <p style={{ color: '#666' }}>Vui lòng chờ trong giây lát để xác định xem bạn đã đánh giá sản phẩm này chưa.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 1: KHI GỬI THÀNH CÔNG (TIM ĐỎ)
  // ==========================================
  if (formStatus === 'success') {
    return (
      <div className="product-review-wrapper">
        <ToastContainer position="top-center" autoClose={3000} theme="colored" />
        <div className="review-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <h2 style={{ color: '#4CAF50', marginBottom: '10px' }}>Cảm ơn bạn! ❤️</h2>
          <p style={{ color: '#666' }}>Đánh giá của bạn đã được ghi nhận và sẽ giúp ích rất nhiều cho các khách hàng khác.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 2: KHI BỊ TRÙNG ĐÁNH GIÁ (Ổ KHÓA)
  // ==========================================
  if (formStatus === 'duplicate') {
    return (
      <div className="product-review-wrapper">
        <ToastContainer position="top-center" autoClose={3000} theme="colored" />
        <div className="review-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <h2 style={{ color: '#f44336', marginBottom: '10px' }}>Đã đánh giá 🔒</h2>
          <p style={{ color: '#666' }}>Bạn đã gửi đánh giá cho sản phẩm này rồi. Cảm ơn bạn đã luôn tin tưởng và ủng hộ HAMONI!</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // GIAO DIỆN 3: FORM ĐÁNH GIÁ MẶC ĐỊNH
  // ==========================================
  return (
    <div className="product-review-wrapper">
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />

      <div className="review-header">
        <div className="product-thumbnail">
          {productImage ? <img src={productImage} alt="Product" /> : <div className="thumb-placeholder"></div>}
        </div>
        <div className="product-title-group">
          <span className="review-label">ĐÁNH GIÁ SẢN PHẨM</span>
          <h2 className="review-product-name">{productName || "Sản phẩm HAMONI"}</h2>
        </div>
      </div>

      <div className="review-card">
        <div className="form-section">
          <label className="section-label">Mức độ hài lòng của bạn</label>
          <div className="star-rating-group">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star-item ${star <= (hover || rating) ? 'active' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="section-label">Nội dung đánh giá</label>
          <textarea
            className="review-textarea"
            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          ></textarea>
        </div>

        <div className="form-section">
          <label className="section-label">Hình ảnh & Video thực tế (Tối đa 5 Ảnh & 5 Video)</label>
          <div className="image-upload-container">
            
            {previews.map((file, index) => (
              <div key={index} className="preview-item">
                {file.type.includes('video') ? (
                  <video src={file.url} className="mock-img" />
                ) : (
                  <img src={file.url} alt="preview" className="mock-img" />
                )}
                <button className="remove-btn" onClick={() => removeFile(index)}>×</button>
              </div>
            ))}
            
            {/* Chỉ hiện nút thêm nếu tổng số file < 10 (5 ảnh + 5 video) */}
            {selectedFiles.length < 10 && (
              <label className="upload-trigger">
                <input 
                  type="file" 
                  hidden 
                  multiple 
                  accept="image/*,video/*" 
                  onChange={handleFileChange} 
                />
                <div className="trigger-content">
                  <span className="plus-icon">+</span>
                  <span className="trigger-text">THÊM ẢNH/VIDEO</span>
                </div>
              </label>
            )}
          </div>
        </div>

        <button className="btn-submit-green" onClick={handleSubmit}>
          Gửi đánh giá
        </button>
      </div>
    </div>
  );
};

export default ProductReview;