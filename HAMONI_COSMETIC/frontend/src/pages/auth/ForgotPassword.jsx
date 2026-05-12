import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, LockKeyhole } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosClient from "../../services/axiosClient";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const navigate = useNavigate();

  // State quản lý luồng (1: Nhập Email, 2: Đổi mật khẩu)
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Data
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ==========================================
  // XỬ LÝ BƯỚC 1: GỬI YÊU CẦU LẤY OTP
  // ==========================================
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      return toast.warning("Vui lòng nhập địa chỉ email!");
    }

    // Regex kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return toast.warning("Email không hợp lệ!");
    }

    setIsLoading(true);
    try {
      const response = await axiosClient.post("/auth/forgot-password", {
        email,
      });

      toast.success(
        response?.message || "Mã OTP đã được gửi đến email của bạn!",
      );
      setStep(2);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Lỗi khi gửi yêu cầu. Có thể email chưa được đăng ký.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // XỬ LÝ BƯỚC 2: ĐẶT LẠI MẬT KHẨU
  // ==========================================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      return toast.warning("Vui lòng điền đầy đủ thông tin!");
    }
    if (newPassword.length < 6) {
      return toast.warning("Mật khẩu mới phải có ít nhất 6 ký tự!");
    }
    if (newPassword !== confirmPassword) {
      return toast.warning("Mật khẩu xác nhận không trùng khớp!");
    }

    setIsLoading(true);
    try {
      const response = await axiosClient.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      toast.success(
        response?.message ||
          "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.",
      );
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Mã OTP không chính xác hoặc đã hết hạn.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4] px-4 font-sans text-slate-800">
      <div className="w-full max-w-105 p-8 md:p-10">
        {/* BƯỚC 1: NHẬP EMAIL */}
        {step === 1 && (
          <div className="text-center animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl text-black mb-3 font-medium">
              Quên mật khẩu
            </h1>
            <p className="text-sm text-gray-500 mb-10">
              Nhập email để nhận mã xác thực
            </p>

            <form onSubmit={handleRequestOTP} className="text-left">
              <div className="mb-8">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 pl-1">
                  ĐỊA CHỈ EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten_email@domain.com"
                  className="w-full bg-transparent border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-black transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white rounded-full py-3.5 text-xs font-semibold tracking-wider uppercase transition-all hover:bg-gray-800 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mb-8"
              >
                {isLoading ? "Đang xử lý..." : "Gửi yêu cầu"}
              </button>
            </form>
          </div>
        )}

        {/* BƯỚC 2: NHẬP OTP & ĐỔI MẬT KHẨU */}
        {step === 2 && (
          <div className="text-center animate-fade-in-up">
            <div className="mx-auto w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center mb-6">
              <LockKeyhole size={20} />
            </div>
            <h1 className="text-3xl md:text-4xl text-black mb-3 font-medium">
              Đặt lại mật khẩu
            </h1>
            <p className="text-sm text-gray-500 mb-10 px-4">
              Vui lòng nhập mã xác thực và mật khẩu mới của bạn.
            </p>

            <form onSubmit={handleResetPassword} className="text-left">
              <div className="mb-5 relative">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 pl-1">
                  MÃ OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Nhập mã 6 chữ số"
                  maxLength={6}
                  className="w-full bg-transparent border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-black transition-colors"
                />
                <div className="absolute right-4 top-8.5 text-gray-400">
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div className="mb-5 relative">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 pl-1">
                  MẬT KHẨU MỚI
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-black transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-8.5 text-gray-400 hover:text-black transition-colors bg-transparent border-0 outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="mb-8 relative">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-2 pl-1">
                  XÁC NHẬN MẬT KHẨU
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-gray-300 rounded-md px-4 py-3 text-sm outline-none focus:border-black transition-colors pr-10"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black text-white rounded-full py-3.5 text-xs font-semibold tracking-wider uppercase transition-all hover:bg-gray-800 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mb-8"
              >
                {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          </div>
        )}

        {/* NÚT QUAY LẠI CHUNG CHO CẢ 2 BƯỚC */}
        <div className="text-center mt-2">
          <Link
            to="/login"
            className="text-[10px] uppercase tracking-widest font-semibold text-gray-500 hover:text-black transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-px after:bg-gray-300 hover:after:bg-black no-underline"
          >
            QUAY LẠI ĐĂNG NHẬP
          </Link>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

export default ForgotPassword;
