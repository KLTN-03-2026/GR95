import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AdminLayout from '../layouts/AdminLayout/AdminLayout';
// import ClientLayout from '../layouts/ClientLayout/ClientLayout'; // Sẽ tạo sau

// Import Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register'; 
import OTP from '../pages/auth/OTP';

// Import Admin Pages
import RoleManagement from '../pages/admin/RoleManagement';
import CustomerManagement from '../pages/admin/Customer/CustomerManagement';
import CustomerDetail from '../pages/admin/Customer/CustomerDetail';
import CategoryManagement from '../pages/admin/category/CategoryManagement';    
import CategoryForm from '../pages/admin/category/CategoryForm';
import EmployeeManagement from '../pages/admin/Employee/EmployeeManagement';
import EmployeeDetail from '../pages/admin/Employee/EmployeeDetail';
import EmployeeForm from '../pages/admin/Employee/EmployeeForm';
import Profile from '../pages/admin/Profile/Profile';
import ForgotPassword from '../pages/auth/ForgotPassword';
import OrderManagement from '../pages/admin/Order/OrderManagement';
import OrderDetail from "../pages/admin/Order/OrderDetailModal";
import OrderLogsPage from '../pages/admin/Order/OrderLogsPage';
import ProductManagement from '../pages/admin/Product/ProductManagement';
import ProductCreate from '../pages/admin/Product/ProductCreate';
import ProductDetail from '../pages/admin/Product/ProductDetail';
import Dashboard from '../pages/admin/Dashboard/DashboardOverview';
import ProductInventoryReport from '../pages/admin/Dashboard/ProductInventoryReport';
import ReviewManagement from '../pages/admin/Reviews/ReviewManagement';
import WarehouseManagement from "../pages/admin/Warehouse/WarehouseManagement";
import WarehouseLog from '../pages/admin/Warehouse/WarehouseLog';
const Home = () => <div>Trang chủ Hamoni E-Commerce</div>;
const NotFound = () => <div>404 - Không tìm thấy trang</div>;

const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(userRaw);
        const roleCode = user?.maQuyen;
        const isAdminAreaAllowed = roleCode === 'ADMIN' || roleCode === 'STAFF' || roleCode === 'KHO';

        if (!isAdminAreaAllowed) {
            return <Navigate to="/" replace />;
        }
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }

    return children;
};

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/otp" element={<OTP />} />
                
                <Route path="/" element={<div className="client-wrapper"><Home /></div>}>
                    <Route index element={<Home />} />
                </Route>

                    <Route
                        path="/admin"
                        element={(
                            <AdminRoute>
                                <AdminLayout />
                            </AdminRoute>
                        )}
                    >
                    <Route index element={<Dashboard />} />
                    <Route path="customers" element={<CustomerManagement />} />
                    <Route path="customer-detail/:id" element={<CustomerDetail />} />
                    <Route path="categories" element={<CategoryManagement />} />
                    <Route path="categories/add" element={<CategoryForm />} />
                    <Route path="categories/edit/:id" element={<CategoryForm />} />
                    <Route path="roles" element={<RoleManagement />} />
                    <Route path="employee" element={<EmployeeManagement />} />
                    <Route path="employee/add" element={<EmployeeForm />} />
                    <Route path="employee/edit/:id" element={<EmployeeForm />} />
                    <Route path="employee-detail/:id" element={<EmployeeDetail />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="orders" element={<OrderManagement />} />
                    <Route path="orders/:id/logs" element={<OrderLogsPage />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="products" element={<ProductManagement />} />
                    <Route path="products/add" element={<ProductCreate />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="inventory-report" element={<ProductInventoryReport />} />
                    <Route path="reviews" element={<ReviewManagement />} />
                    <Route path="warehouse" element={<WarehouseManagement />} />
                    <Route path="warehouse-logs" element={<WarehouseLog />} />
                    
                </Route>
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;