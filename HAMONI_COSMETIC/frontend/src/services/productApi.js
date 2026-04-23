import axiosClient from './axiosClient';

const productApi = {
    getPublicDetail: (id) => axiosClient.get(`/products/${id}/public`),
    getProductReviews: (id, params = {}) => axiosClient.get(`/products/${id}/reviews`, { params }),
    getSuggestedProducts: (id, params = {}) => axiosClient.get(`/products/${id}/suggestions`, { params })
};

export default productApi;
