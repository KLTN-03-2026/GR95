import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    hoTen: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  const navigate = useNavigate();

  const handleRegister = async () => {
    if(!formData.hoTen || !formData.email || !formData.password) {
      return alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
    }
    if (formData.password !== formData.confirmPassword) {
      return alert("Mật khẩu xác nhận không khớp!");
    }

    const dataToSend = {
      hoTen: formData.hoTen,
      email: formData.email,
      password: formData.password
    };

    try {
      const response = await axios.post("http://localhost:5000/api/auth/register", dataToSend);
      alert(response.data.message || "Mã OTP đã được gửi!");
      navigate("/otp", { 
        state: { 
          email: formData.email,
          hoTen: formData.hoTen,
          password: formData.password 
        } 
      });

    } catch (err) {
      const errorMsg = err.response?.data?.message || "Lỗi đăng ký (Email có thể đã tồn tại hoặc lỗi server)";
      alert("Lỗi đăng ký: " + errorMsg);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <img src="https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=1000" alt="Hamoni Decor" />
          <div className="brand-tag">HAMONI COSMETIC — ATELIER DE BEAUTÉ</div>
        </div>

        <div className="auth-right">
          <h2 className="brand-title">HAMONI COSMETIC</h2>
          <p className="subtitle">Tạo tài khoản mới để trải nghiệm.</p>
          
          <div className="input-group">
            <label>HỌ VÀ TÊN</label>
            <input type="text" placeholder="Nguyễn Văn A" value={formData.hoTen} onChange={e => setFormData({...formData, hoTen: e.target.value})} />
          </div>

          <div className="input-group">
            <label>EMAIL XÁC THỰC</label>
            <input type="email" placeholder="example@hamoni.vn" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="input-group">
            <label>MẬT KHẨU</label>
            <input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="input-group">
            <label>XÁC NHẬN MẬT KHẨU</label>
            <input type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
          </div>

          <div className="checkbox-group">
            <input type="checkbox" id="terms" defaultChecked />
            <label htmlFor="terms">Tôi đồng ý với các điều khoản bảo mật</label>
          </div>

          <button className="auth-btn" onClick={handleRegister}>
            ĐĂNG KÝ TÀI KHOẢN →
          </button>
          
          <p className="footer-text">
            Đã có tài khoản? <span onClick={() => navigate("/login")}>Đăng nhập ngay</span>
          </p>
        </div>
      </div>
    </div>
  );
}