// src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authApi from '../../services/authApi'; // Import API Service thay vì axios thuần
import { useStore } from '../../store/useStore';
import './Login.css'; 

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const loginSuccess = useStore((state) => state.loginSuccess);

  const handleLogin = async () => {
    const payload = {
      email: formData.email.trim(),
      password: formData.password.trim(),
    };

    // Kiểm tra sơ bộ xem người dùng đã nhập chưa
    if (!payload.email || !payload.password) {
        alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
        return;
    }

    try {
      const response = await authApi.login(payload);
      const normalizedUser = {
        ...response.user,
        name: response.user?.name || response.user?.hoTen || response.user?.HoTen || '',
      };

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      loginSuccess(normalizedUser);

      toast.success(`Chào mừng ${normalizedUser.name} quay trở lại!`);

      // Điều hướng thông minh dựa trên mã quyền thực tế từ DB
      const roleCode = normalizedUser.maQuyen;

      if (roleCode === 'ADMIN') {
        localStorage.setItem('userPermissions', JSON.stringify(['ALL']));
      } else {
        try {
          const meRes = await authApi.getCurrentUser();
          localStorage.setItem('userPermissions', JSON.stringify(meRes?.user?.permissions || []));
        } catch {
          localStorage.setItem('userPermissions', JSON.stringify([]));
        }
      }

      if (roleCode === 'ADMIN' || roleCode === 'STAFF' || roleCode === 'KHO') {
        navigate("/admin/dashboard");
      } else {
        navigate("/"); 
      }
    } catch (err) {
      // Xử lý thông báo lỗi từ Backend trả về
      const errorMsg = err.response?.data?.message || err.response?.data || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!";
      toast.error(errorMsg);
      console.error("Lỗi đăng nhập:", err);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <img 
            src="https://images.unsplash.com/photo-1631730486784-02981683bda3?auto=format&fit=crop&q=80&w=1000" 
            alt="Hamoni Cosmetic" 
          />
          <div className="brand-tag">HAMONI COSMETIC — ATELIER DE BEAUTÉ</div>
        </div>

        <div className="auth-right">
          <h2 className="brand-title">HAMONI COSMETIC</h2>
          <p className="subtitle">Chào mừng trở lại. Đăng nhập để tiếp tục.</p>
          
          <div className="input-group">
            <label>EMAIL</label>
            <input 
              type="email" 
              placeholder="example@hamoni.vn"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label>MẬT KHẨU</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="checkbox-group" style={{ justifyContent: 'space-between' }}>
            <div>
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" style={{ textTransform: 'none', color: '#888', marginLeft: '5px' }}>Ghi nhớ đăng nhập</label>
            </div>
            <span style={{ fontSize: '11px', color: '#1a1a1a', cursor: 'pointer', fontWeight: '600' }}>Quên mật khẩu?</span>
          </div>

          <button className="auth-btn" onClick={handleLogin}>
            ĐĂNG NHẬP →
          </button>
          
          <p className="footer-text">
            Chưa có tài khoản? <span style={{cursor: 'pointer', color: '#8b9d83'}} onClick={() => navigate("/register")}>Tạo tài khoản mới</span>
          </p>
        </div>
      </div>
    </div>
  );
}