import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, MailOpen } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function OTP() {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();

  const { email } = location.state || { email: "pthi70483@gmail.com" };

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (timer > 0) return;

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/auth/resend-otp`, { email });

      alert("Mã OTP mới đã được gửi!");
      setTimer(60);
      setOtp(new Array(6).fill(""));
      inputRefs.current[0].focus();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể gửi lại mã");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) {
      let newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    let newOtp = [...otp];
    // Chỉ lấy số cuối cùng được nhập vào ô
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    // Tự động nhảy sang ô tiếp theo
    if (index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1].focus();
      }
      let newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const finalOtp = otp.join("");
    if (finalOtp.length < 6) return alert("Vui lòng nhập đủ 6 số!");

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        email,
        otp: finalOtp,
      });
      alert("Xác thực thành công!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Mã OTP không chính xác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-100 p-4 font-sans relative overflow-hidden">
      {/* Vòng tròn trang trí background */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-rose-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-200/30 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 sm:p-10 relative z-10 border border-white/50 backdrop-blur-sm">
        {/* Icon Header */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm relative">
            <MailOpen className="text-rose-500" size={32} strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <ShieldCheck className="text-white" size={16} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Tiêu đề */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Xác thực email
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Chúng tôi vừa gửi mã OTP gồm 6 chữ số đến
            <br />
            <span className="font-semibold text-rose-600">{email}</span>
          </p>
        </div>

        {/* Khung nhập OTP */}
        <div className="flex justify-between gap-2 sm:gap-3 mb-8">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength="1"
              ref={(el) => (inputRefs.current[index] = el)}
              value={data}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 outline-none transition-all shadow-sm"
              placeholder="-"
            />
          ))}
        </div>

        {/* Nút Xác Nhận */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length < 6}
          className="w-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-500/30 mb-8 disabled:opacity-60 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              ĐANG XỬ LÝ...
            </span>
          ) : (
            "XÁC NHẬN"
          )}
        </button>

        {/* Footer Links */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-slate-500">
            Chưa nhận được mã?{" "}
            <button
              onClick={handleResend}
              disabled={timer > 0}
              className={`font-semibold transition-colors focus:outline-none ${
                timer > 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-rose-600 hover:text-rose-700 underline underline-offset-2"
              }`}
            >
              Gửi lại {timer > 0 && `(${timer}s)`}
            </button>
          </p>

          <button
            onClick={() => navigate("/register")}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
          >
            <ArrowLeft size={16} />
            Quay lại đăng ký
          </button>
        </div>
      </div>
    </div>
  );
}
