import axiosClient from './axiosClient';

const reviewApi = {

    // ===== STATS =====
    getStats: () => {
        return axiosClient.get('/reviews/stats');
    },

    // ===== GET ALL + FILTER + SEARCH =====
    getAll: (params = {}) => {
        return axiosClient.get('/reviews', { params });
    },

    // ===== UPDATE STATUS =====
    updateStatus: (id, status) => {
        return axiosClient.put(`/reviews/${id}/status`, {
            status
        });
    },

    // ===== REPLY (FIX CHUẨN) =====
    replyReview: (id, replyComment) => {
        return axiosClient.put(`/reviews/${id}/reply`, {
            replyComment: replyComment   // ✅ đúng format BE
        });
    },

};

export default reviewApi;