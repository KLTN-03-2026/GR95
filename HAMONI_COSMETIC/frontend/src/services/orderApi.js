import axiosClient from './axiosClient';

const orderApi = {
    getOrders: (params) => axiosClient.get('/orders', { params }),
    getCheckoutPreview: (payload = {}) => axiosClient.post('/orderpayment/preview', payload),
    getCheckoutProfile: () => axiosClient.get('/orderpayment/profile'),
    placeOrder: (payload = {}) => axiosClient.post('/orderpayment/place', payload),
    confirmOnlinePayment: (payload) => axiosClient.post('/orderpayment/confirm-online', payload),
    getOnlinePaymentStatus: (orderId) => axiosClient.get(`/orderpayment/status/${orderId}`)
};

export default orderApi;