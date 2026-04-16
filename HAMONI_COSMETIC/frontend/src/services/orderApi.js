import axiosClient from './axiosClient';

const orderApi = {
    getOrders: (params) => axiosClient.get('/orders', { params })
};

export default orderApi;