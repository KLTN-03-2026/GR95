// Thay đổi đường dẫn import cho khớp với thư mục của bạn
import axiosClient from './axiosClient'; 

export const createReview = async (formData) => {
  try {
    // BẮT BUỘC phải có headers này để ghi đè mặc định của axiosClient, ép nó gửi File đi
    const response = await axiosClient.post('/product-reviews/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Đang tải lên: ${percentCompleted}%`);
      }
    });

    // TRẢ VỀ NGUYÊN BẢN RESPONSE
    return response; 
  } catch (error) {
    console.error("Lỗi tại productreviewApi:", error.response?.data || error.message);
    throw error;
  }
};

// ĐÃ THÊM: Hàm gọi API kiểm tra lịch sử đánh giá (để không bị khóa form oan)
export const checkReviewHistory = async (MaDH, MaSP, MaND) => {
  try {
    // Lưu ý: Đường dẫn '/product-reviews/check-history' có thể cần đổi lại nếu route BE của bạn tên khác
    const response = await axiosClient.get('/product-reviews/check-history', {
      params: { MaDH, MaSP, MaND }
    });
    return response;
  } catch (error) {
    console.error("Lỗi khi check lịch sử đánh giá:", error);
    throw error;
  }
};