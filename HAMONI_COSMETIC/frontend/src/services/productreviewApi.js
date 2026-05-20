import axiosClient from "./axiosClient";

export const createReview = async (formData) => {
  try {
    const data = await axiosClient.post("/product-reviews/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total || 1;
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / total,
        );
        console.log(`Đang tải lên: ${percentCompleted}%`);
      },
    });

    return data;
  } catch (error) {
    console.error(
      "Lỗi tại productreviewApi:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const checkReviewHistory = async (MaDH, MaSP, MaND) => {
  try {
    const data = await axiosClient.get("/product-reviews/check-history", {
      params: { MaDH, MaSP, MaND },
    });

    return data;
  } catch (error) {
    // Nếu backend trả 404 nghĩa là chưa đánh giá thì không cần báo lỗi đỏ
    if (error.response?.status === 404) {
      return {
        reviewed: false,
        review: null,
        message: "Chưa đánh giá sản phẩm này",
      };
    }

    console.error("Lỗi khi check lịch sử đánh giá:", error);
    throw error;
  }
};
