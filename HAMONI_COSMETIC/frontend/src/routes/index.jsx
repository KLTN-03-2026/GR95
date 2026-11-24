import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ==========================================
// 0. IMPORT COMPONENTS
// ==========================================
import ScrollRestoration from "../components/ScrollRestoration";

// ==========================================
// 1. IMPORT LAYOUTS
// ==========================================
import AdminLayout from "../layouts/AdminLayout/AdminLayout";
import ClientLayout from "../layouts/ClientLayout/ClientLayout";

// ==========================================
// 2. IMPORT CLIENT PAGES (Khách hàng)
// ==========================================

const Home = React.lazy(() => import('../pages/client/home/Home'));
const ClientProducts = React.lazy(() => import('../pages/client/products/ClientProducts'));
const ProductDetailView = React.lazy(() => import('../pages/client/ProductDetailView/ProductDetailView'));
const ShoppingCart = React.lazy(() => import('../pages/client/Cart/ShoppingCart'));
const OrderPayment = React.lazy(() => import('../pages/client/Payment/orderpayment'));
const OrderHistory = React.lazy(() => import('../pages/client/Orderhistory/Orderhistory'));
const ClientOrderDetail = React.lazy(() => import('../pages/client/Orderhistory/OrderDetails'));
const CustomerProfile = React.lazy(() => import('../pages/client/Profile/CustomerProfile'));
const PromotionClient = React.lazy(() => import('../pages/client/PromotionClient/PromotionClient'));
const PromotionDetailClient = React.lazy(() => import('../pages/client/PromotionClient/PromotionDetailClient'));

// ==========================================
// 3. IMPORT AUTH PAGES (Xác thực)
// ==========================================
const AuthPage = React.lazy(() => import('../pages/auth/AuthPage'));
const OTP = React.lazy(() => import('../pages/auth/OTP'));
const ForgotPassword = React.lazy(() => import('../pages/auth/ForgotPassword'));

// ==========================================
// 4. IMPORT ADMIN PAGES (Quản trị)
// ==========================================
const RoleManagement = React.lazy(() => import('../pages/admin/RoleManagement'));
const CustomerManagement = React.lazy(() => import('../pages/admin/Customer/CustomerManagement'));
const CustomerDetail = React.lazy(() => import('../pages/admin/Customer/CustomerDetail'));
const CategoryManagement = React.lazy(() => import('../pages/admin/category/CategoryManagement'));
const CategoryForm = React.lazy(() => import('../pages/admin/category/CategoryForm'));
const EmployeeManagement = React.lazy(() => import('../pages/admin/Employee/EmployeeManagement'));
const EmployeeDetail = React.lazy(() => import('../pages/admin/Employee/EmployeeDetail'));
const EmployeeForm = React.lazy(() => import('../pages/admin/Employee/EmployeeForm'));
const Profile = React.lazy(() => import('../pages/admin/Profile/Profile'));
const OrderManagement = React.lazy(() => import('../pages/admin/Order/OrderManagement'));
const OrderDetail = React.lazy(() => import('../pages/admin/Order/OrderDetailModal'));
const OrderLogsPage = React.lazy(() => import('../pages/admin/Order/OrderLogsPage'));
const ProductManagement = React.lazy(() => import('../pages/admin/Product/ProductManagement'));
const ProductCreate = React.lazy(() => import('../pages/admin/Product/ProductCreate'));
const ProductDetail = React.lazy(() => import('../pages/admin/Product/ProductDetail'));
const Dashboard = React.lazy(() => import('../pages/admin/Dashboard/DashboardOverview'));
const ProductInventoryReport = React.lazy(() => import('../pages/admin/Dashboard/ProductInventoryReport'));
const ReviewManagement = React.lazy(() => import('../pages/admin/Reviews/ReviewManagement'));
const VoucherManagement = React.lazy(() => import('../pages/admin/Voucher/VoucherManagement'));
const VoucherDetail = React.lazy(() => import('../pages/admin/Voucher/VoucherDetail'));
const PromotionManagement = React.lazy(() => import('../pages/admin/Promotion/PromotionManagement'));
const PromotionCreate = React.lazy(() => import('../pages/admin/Promotion/PromotionCreate'));
const PromotionDetail = React.lazy(() => import('../pages/admin/Promotion/PromotionDetail'));
const WarehouseManagement = React.lazy(() => import('../pages/admin/Warehouse/WarehouseManagement'));
const WarehouseLog = React.lazy(() => import('../pages/admin/Warehouse/WarehouseLog'));
const BannerManagement = React.lazy(() => import('../pages/admin/Banner/BannerManagement'));
const AiConfigPage = React.lazy(() => import('../pages/admin/AI/AiConfigPage'));
const AdminChat = React.lazy(() => import('../pages/admin/AI/AdminChatPage'));

const NotFound = () => (
  <div className="flex justify-center items-center h-screen text-2xl font-bold text-gray-500">
    404 - Không tìm thấy trang
  </div>
);

const ADMIN_ROLES = new Set(["ADMIN", "STAFF", "KHO"]);

const getStoredAuth = () => {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (!token || !userRaw) {
    return { token: null, user: null };
  }

  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  }
};

const getRoleCode = (user) =>
  String(user?.maQuyen || user?.MaQuyen || user?.role || "").toUpperCase();

const getPostLoginPath = (user) =>
  getRoleCode(user) === 'KHO' ? '/admin/warehouse' : ADMIN_ROLES.has(getRoleCode(user)) ? "/admin/dashboard" : "/";

const AuthRoute = ({ children }) => {
  const { token, user } = getStoredAuth();

  if (token && user) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return children;
};

const ClientRoute = ({ children }) => {
  const { token, user } = getStoredAuth();

  if (token && user && ADMIN_ROLES.has(getRoleCode(user))) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return children;
};

// --- BẢO VỆ ĐƯỜNG DẪN ADMIN ---
const AdminRoute = ({ children }) => {
  const { token, user } = getStoredAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAdminAreaAllowed = ADMIN_ROLES.has(getRoleCode(user));

  if (!isAdminAreaAllowed) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <ScrollRestoration />
      <React.Suspense fallback={<div className="p-4">Đang tải...</div>}>
      <Routes>
        {/* ==========================================

                    KHU VỰC 1: XÁC THỰC (Không cần Layout)
                    ========================================== */}
        <Route
          path="/forgot-password"
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          }
        />
        {/* <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> */}
        <Route path="/otp" element={<OTP />} />
        <Route
          path="/quen-mat-khau"
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          }
        />
        <Route
          path="/login"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />

        {/* ==========================================
                    KHU VỰC 2: KHÁCH HÀNG (Sử dụng ClientLayout)
                    ========================================== */}

        <Route
          path="/"
          element={
            <ClientRoute>
              <ClientLayout />
            </ClientRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="products" element={<ClientProducts />} />
          <Route path="promotions" element={<PromotionClient />} />
          {/* Thêm đúng 1 dòng Route này để web hiểu link /khuyen-mai/2 */}
          <Route path="khuyen-mai/:id" element={<PromotionDetailClient />} />
          <Route path="gio-hang" element={<ShoppingCart />} />
          <Route path="cart" element={<ShoppingCart />} />
          <Route path="product/:productId" element={<ProductDetailView />} />
          <Route path="orderpayment" element={<OrderPayment />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orderhistory" element={<OrderHistory />} />
          <Route path="order/:id" element={<ClientOrderDetail />} />

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
          <Route index element={<ProductManagement />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
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
          <Route path="products" element={<ProductManagement />} />
          <Route path="products/add" element={<ProductCreate />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/logs" element={<OrderLogsPage />} />
          <Route path="warehouse" element={<WarehouseManagement />} />
          <Route path="warehouse-logs" element={<WarehouseLog />} />
          <Route path="inventory-report" element={<ProductInventoryReport />} />
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
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="ai-config" element={<AiConfigPage />} />
          <Route path="chats" element={<AdminChat />} />
        </Route>

        {/* Trang 404 cho các đường dẫn sai */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
