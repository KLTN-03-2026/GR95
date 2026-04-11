import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Key, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import axiosClient from '../../services/axiosClient'; // Đảm bảo đường dẫn đúng
import './ForgotPassword.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    
    // State quản lý luồng: step 1 (Nhập Email), step 2 (Nhập OTP & Mật khẩu mới)
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Xử lý Bước 1: Gửi yêu cầu lấy OTP
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAlert({ show: false, type: '', message: '' });

        try {
            // Gọi API gửi OTP (Chúng ta sẽ làm ở Backend sau)
            await axiosClient.post('/auth/forgot-password', { Email: email });
            
            setAlert({ show: true, type: 'success', message: 'Mã xác nhận (OTP) đã được gửi đến email của bạn!' });
            setTimeout(() => {
                setAlert({ show: false, type: '', message: '' });
                setStep(2); // Chuyển sang bước 2
            }, 1500);
        } catch (error) {
            setAlert({ 
                show: true, 
                type: 'danger', 
                message: error.response?.data?.message || 'Email không tồn tại trong hệ thống!' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Xử lý Bước 2: Xác nhận OTP và đặt lại mật khẩu
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setAlert({ show: true, type: 'danger', message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
            return;
        }

        setIsLoading(true);
        setAlert({ show: false, type: '', message: '' });

        try {
            // Gọi API đặt lại mật khẩu
            await axiosClient.post('/auth/reset-password', { 
                Email: email, 
                OTP: otp, 
                MatKhauMoi: newPassword 
            });
            
            setAlert({ show: true, type: 'success', message: 'Đặt lại mật khẩu thành công! Đang chuyển hướng...' });
            setTimeout(() => {
                navigate('/login'); // Đổi mật khẩu xong thì đá về trang Login
            }, 2000);
        } catch (error) {
            setAlert({ 
                show: true, 
                type: 'danger', 
                message: error.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn!' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-card shadow-lg rounded-4 border-0">
                <div className="card-body p-5">
                    <div className="text-center mb-4">
                        <h2 className="fw-bold text-dark mb-2">HAMONI</h2>
                        <p className="text-muted">
                            {step === 1 ? 'Khôi phục quyền truy cập tài khoản' : 'Thiết lập mật khẩu mới'}
                        </p>
                    </div>

                    {alert.show && (
                        <div className={`alert alert-${alert.type} d-flex align-items-center p-3 mb-4`} role="alert">
                            {alert.type === 'success' ? <CheckCircle size={20} className="me-2 flex-shrink-0" /> : <AlertCircle size={20} className="me-2 flex-shrink-0" />}
                            <div className="fw-medium" style={{ fontSize: '14px' }}>{alert.message}</div>
                        </div>
                    )}

                    {/* BƯỚC 1: NHẬP EMAIL */}
                    {step === 1 && (
                        <form onSubmit={handleSendOTP}>
                            <div className="mb-4">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '14px' }}>Địa chỉ Email của bạn</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0">
                                        <Mail size={18} className="text-muted" />
                                    </span>
                                    <input 
                                        type="email" 
                                        className="form-control form-control-lg bg-light border-start-0 ps-0" 
                                        placeholder="Ví dụ: admin@hamoni.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className="btn w-100 fw-bold text-white mb-3 py-2" 
                                style={{ backgroundColor: '#003399', fontSize: '15px' }}
                                disabled={isLoading}
                            >
                                {isLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Gửi mã xác nhận'}
                            </button>
                        </form>
                    )}

                    {/* BƯỚC 2: NHẬP OTP & MẬT KHẨU MỚI */}
                    {step === 2 && (
                        <form onSubmit={handleResetPassword}>
                            <div className="alert bg-light border text-center mb-4 p-2" style={{ fontSize: '13px' }}>
                                Mã xác nhận đã được gửi đến <strong>{email}</strong>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '14px' }}>Mã OTP (6 số)</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0">
                                        <Key size={18} className="text-muted" />
                                    </span>
                                    <input 
                                        type="text" 
                                        maxLength="6"
                                        className="form-control form-control-lg bg-light border-start-0 ps-0 text-center fw-bold text-primary tracking-widest" 
                                        placeholder="------"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required 
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '14px' }}>Mật khẩu mới</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0">
                                        <Lock size={18} className="text-muted" />
                                    </span>
                                    <input 
                                        type="password" 
                                        className="form-control form-control-lg bg-light border-start-0 ps-0" 
                                        placeholder="Ít nhất 6 ký tự"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required 
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className="btn w-100 fw-bold text-white mb-3 py-2" 
                                style={{ backgroundColor: '#003399', fontSize: '15px' }}
                                disabled={isLoading}
                            >
                                {isLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Xác nhận đổi mật khẩu'}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-3">
                        <Link to="/login" className="text-decoration-none text-muted fw-medium d-inline-flex align-items-center gap-1 hover-primary">
                            <ArrowLeft size={16} /> Quay lại trang đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;