import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ==========================================
// 1. IMPORT LAYOUTS
// ==========================================
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import ClientLayout from '../layouts/ClientLayout/ClientLayout';

// ==========================================
// 2. IMPORT CLIENT PAGES (Khách hàng)
// ==========================================
import Home from '../pages/client/home/Home';
import ClientProducts from '../pages/client/products/ClientProducts';

// ==========================================
// 3. IMPORT AUTH PAGES (Xác thực)
// ==========================================
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register'; 
import OTP from '../pages/auth/OTP';
import ForgotPassword from '../pages/auth/ForgotPassword';

// ==========================================
// 4. IMPORT ADMIN PAGES (Quản trị)
// ==========================================
import RoleManagement from '../pages/admin/RoleManagement';
import CustomerManagement from '../pages/admin/Customer/CustomerManagement';
import CustomerDetail from '../pages/admin/Customer/CustomerDetail';
import CategoryManagement from '../pages/admin/category/CategoryManagement';    
import CategoryForm from '../pages/admin/category/CategoryForm';
import EmployeeManagement from '../pages/admin/Employee/EmployeeManagement';
import EmployeeDetail from '../pages/admin/Employee/EmployeeDetail';
import EmployeeForm from '../pages/admin/Employee/EmployeeForm';
import Profile from '../pages/admin/Profile/Profile';
import OrderManagement from '../pages/admin/Order/OrderManagement';
import OrderDetail from "../pages/admin/Order/OrderDetailModal";
import OrderLogsPage from '../pages/admin/Order/OrderLogsPage';
import ProductManagement from '../pages/admin/Product/ProductManagement';
import ProductCreate from '../pages/admin/Product/ProductCreate';
import ProductDetail from '../pages/admin/Product/ProductDetail';
import Dashboard from '../pages/admin/Dashboard/DashboardOverview';
import ProductInventoryReport from '../pages/admin/Dashboard/ProductInventoryReport';
import ReviewManagement from '../pages/admin/Reviews/ReviewManagement';
import VoucherManagement from '../pages/admin/Voucher/VoucherManagement';
import VoucherDetail from '../pages/admin/Voucher/VoucherDetail';
import PromotionManagement from '../pages/admin/Promotion/PromotionManagement';
import PromotionCreate from '../pages/admin/Promotion/PromotionCreate';
import PromotionDetail from '../pages/admin/Promotion/PromotionDetail';
import WarehouseManagement from "../pages/admin/Warehouse/WarehouseManagement";
import WarehouseLog from '../pages/admin/Warehouse/WarehouseLog';
import BannerManagement from '../pages/admin/Banner/BannerManagement';

const NotFound = () => <div className="flex justify-center items-center h-screen text-2xl font-bold text-gray-500">404 - Không tìm thấy trang</div>;

// --- BẢO VỆ ĐƯỜNG DẪN ADMIN ---
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
                {/* ==========================================
                    KHU VỰC 1: XÁC THỰC (Không cần Layout)
                    ========================================== */}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/otp" element={<OTP />} />
                
                {/* ==========================================
                    KHU VỰC 2: KHÁCH HÀNG (Sử dụng ClientLayout)
                    ========================================== */}
                <Route path="/" element={<ClientLayout />}>
                    <Route index element={<Home />} />
                    {/* Sau này thêm trang cho khách ở đây. VD: */}
                    {/* <Route path="cart" element={<Cart />} /> */}
                    <Route path="products" element={<ClientProducts />} />
                </Route>

                {/* ==========================================
                    KHU VỰC 3: QUẢN TRỊ VIÊN (Sử dụng AdminLayout + Bọc AdminRoute)
                    ========================================== */}
                <Route 
                    path="/admin" 
                    element={
                        <AdminRoute>
                            <AdminLayout />
                        </AdminRoute>
                    }
                >
                    {/* Dashboard */}
                    <Route index element={<ProductManagement />} /> {/* Tạm lấy Product làm trang mặc định của Admin */}
                    <Route path="dashboard" element={<Dashboard />} />
                    
                    {/* Quản lý Tài khoản & Nhân sự */}
                    <Route path="profile" element={<Profile />} />
                    <Route path="roles" element={<RoleManagement />} />
                    <Route path="employee" element={<EmployeeManagement />} />
                    <Route path="employee/add" element={<EmployeeForm />} />
                    <Route path="employee/edit/:id" element={<EmployeeForm />} />
                    <Route path="employee-detail/:id" element={<EmployeeDetail />} />
                    <Route path="customers" element={<CustomerManagement />} />
                    <Route path="customer-detail/:id" element={<CustomerDetail />} />
                    
                    {/* Quản lý Danh mục & Sản phẩm */}
                    <Route path="categories" element={<CategoryManagement />} />
                    <Route path="categories/add" element={<CategoryForm />} />
                    <Route path="categories/edit/:id" element={<CategoryForm />} />
                    <Route path="products" element={<ProductManagement />} />
                    <Route path="products/add" element={<ProductCreate />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    
                    {/* Quản lý Đơn hàng & Kho */}
                    <Route path="orders" element={<OrderManagement />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="orders/:id/logs" element={<OrderLogsPage />} />
                    <Route path="warehouse" element={<WarehouseManagement />} />
                    <Route path="warehouse-logs" element={<WarehouseLog />} />
                    <Route path="inventory-report" element={<ProductInventoryReport />} />
                    
                    {/* Quản lý Marketing & Khuyến mãi */}
                    <Route path="banners" element={<BannerManagement />} />
                    <Route path="banners/add" element={<BannerManagement />} />
                    <Route path="banners/edit/:id" element={<BannerManagement />} />
                    <Route path="promotions" element={<PromotionManagement />} />
                    <Route path="promotions/create" element={<PromotionCreate />} />
                    <Route path="promotions/:id" element={<PromotionDetail />} />
                    <Route path="vouchers" element={<VoucherManagement />} />
                    <Route path="vouchers/:id" element={<VoucherDetail />} />
                    <Route path="voucher-detail/:id" element={<VoucherDetail />} />
                    <Route path="voucherdetail/:id" element={<VoucherDetail />} />
                    
                    {/* Quản lý Đánh giá */}
                    <Route path="reviews" element={<ReviewManagement />} />
                </Route>

                {/* ==========================================
                    KHU VỰC 4: LỖI 404 CATCH-ALL
                    ========================================== */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;