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