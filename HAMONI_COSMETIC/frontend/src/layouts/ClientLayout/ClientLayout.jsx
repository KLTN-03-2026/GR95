import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom'; // Thêm useNavigate
import { Search, ShoppingCart, User, Menu, Bell, FileText, Settings, LogOut } from 'lucide-react';
import { useStore } from '../../store/useStore'; 
import './ClientLayout.css';

const ClientLayout = () => {
    // 1. GỌI USER VÀ HÀM LOGOUT TỪ GLOBAL STORE (ZUSTAND)
    const { cartCount, user, logout } = useStore(); 
    
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSearchSuggest, setShowSearchSuggest] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    
    const navigate = useNavigate(); // Khởi tạo hook chuyển trang
    
    const notificationCount = 2; // Số thông báo giả định (Lấy từ CSDL sau)

    // Hiệu ứng Sticky Navbar
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    // 2. CẬP NHẬT LOGIC ĐĂNG XUẤT
    const handleLogout = () => {
        setIsUserMenuOpen(false);
        logout(); // Xóa state user trong Zustand
        localStorage.removeItem('token'); // Xóa token bảo mật (nếu có)
        navigate('/login'); // Đẩy về trang đăng nhập
    };

    return (
        <div className="client-theme min-h-screen flex flex-col bg-gray-50 text-slate-800 font-sans">
            
            {/* Tối ưu SEO */}
            <header className="hidden"><h1>Hamoni Cosmetic - Mỹ phẩm thiên nhiên cao cấp</h1></header>

            {/* NAVBAR */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
                isScrolled ? 'bg-white shadow-md py-2' : 'bg-white/95 backdrop-blur-sm border-b border-gray-100 py-4'
            }`}>
                <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-8">
                    
                    {/* Logo & Mobile Menu */}
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-slate-600 hover:text-rose-500 transition-colors"><Menu size={24}/></button>
                        <Link to="/" className="text-2xl font-black tracking-tight text-slate-900 no-underline flex items-center gap-1">
                            HAMONI<span className="text-rose-500"></span>
                        </Link>
                    </div>

                    {/* Main Menu (Desktop) */}
                    <ul className="hidden lg:flex items-center gap-8 font-medium text-sm text-slate-600 mb-0 pl-0">
                        <li><Link to="/" className="hover:text-rose-500 transition-colors no-underline">Trang chủ</Link></li>
                        <li><Link to="/products" className="hover:text-rose-500 transition-colors no-underline">Sản phẩm</Link></li>
                        <li><Link to="/khuyen-mai" className="hover:text-rose-500 transition-colors no-underline text-rose-500 font-semibold">Khuyến mãi</Link></li>
                        <li><Link to="/lien-he" className="hover:text-rose-500 transition-colors no-underline">Liên hệ</Link></li>
                    </ul>

                    {/* Search Bar (Trung tâm) */}
                    <div className="hidden md:block flex-1 max-w-md relative">
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm kem dưỡng, serum..." 
                                className="w-full bg-slate-100 text-sm rounded-full py-2.5 pl-5 pr-12 border border-transparent focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all"
                                onFocus={() => setShowSearchSuggest(true)}
                                onBlur={() => setTimeout(() => setShowSearchSuggest(false), 200)}
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors">
                                <Search size={14} />
                            </button>
                        </div>
                        
                        {/* Gợi ý tìm kiếm */}
                        {showSearchSuggest && (
                            <div className="absolute top-full mt-2 w-full bg-white shadow-xl rounded-xl border border-gray-100 p-4 z-50">
                                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">Lịch sử tìm kiếm</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200">Serum Vitamin C</span>
                                    <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200">Kem chống nắng</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Icons Right (Thông báo, Giỏ hàng, User) */}
                    <div className="flex items-center gap-6">
                        
                        {/* 1. THÔNG BÁO */}
                        <div className="relative group flex items-center">
                            <button className="relative text-slate-600 hover:text-rose-500 transition-colors py-2">
                                <Bell size={22} />
                                {notificationCount > 0 && (
                                    <span className="absolute top-1 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                                        {notificationCount}
                                    </span>
                                )}
                            </button>
                            <span className="client-icon-tooltip absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                Thông báo
                            </span>
                        </div>

                        {/* 2. GIỎ HÀNG */}
                        <div className="relative group flex items-center">
                            <Link to="/cart" className="relative text-slate-600 hover:text-rose-500 transition-colors py-2">
                                <ShoppingCart size={22} />
                                {cartCount > 0 && (
                                    <span className="absolute top-1 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            <span className="client-icon-tooltip absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                Giỏ hàng
                            </span>
                        </div>

                        {/* 3. USER KHU VỰC ĐĂNG NHẬP / DROPDOWN */}
                        <div className="hidden sm:block relative py-2" ref={userMenuRef}>
                            {user ? (
                                /* GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP */
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsUserMenuOpen((prev) => !prev)}
                                        className="flex items-center gap-2 text-left"
                                        aria-expanded={isUserMenuOpen}
                                        aria-haspopup="menu"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold border border-rose-200 uppercase">
                                            {user.name ? user.name.charAt(0) : 'U'}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700 max-w-[100px] truncate">
                                            {user.name}
                                        </span>
                                    </button>

                                    {/* MENU XỔ XUỐNG */}
                                    <div className={`client-user-menu absolute top-full right-0 w-56 bg-white shadow-xl rounded-xl border border-gray-100 z-50 ${isUserMenuOpen ? 'is-open' : ''}`}>
                                        <div className="px-4 py-3 border-b border-gray-50">
                                            <p className="text-xs text-slate-400 mb-0">Tài khoản của</p>
                                            <p className="text-sm font-bold text-slate-800 truncate mb-0">{user.name}</p>
                                        </div>
                                        <ul className="py-2 pl-0 mb-0">
                                            <li>
                                                <Link to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 no-underline transition-colors">
                                                    <Settings size={16}/> Cập nhật thông tin
                                                </Link>
                                            </li>
                                            <li>
                                                <Link to="/orders" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-rose-50 hover:text-rose-600 no-underline transition-colors">
                                                    <FileText size={16}/> Lịch sử đơn hàng
                                                </Link>
                                            </li>
                                        </ul>
                                        <div className="p-2 border-t border-gray-50">
                                            <button 
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 w-full text-left px-2 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <LogOut size={16}/> Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* GIAO DIỆN KHI CHƯA ĐĂNG NHẬP */
                                <div className="flex items-center">
                                    <Link to="/login" className="text-slate-600 hover:text-rose-500 transition-colors flex items-center">
                                        <User size={22} />
                                    </Link>
                                    
                                    <span className="client-icon-tooltip absolute -bottom-8 right-0 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        Đăng ký / Đăng nhập
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* MAIN CONTENT */}
            <main className="flex-1 mt-[80px]">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="bg-white border-t border-gray-200 pt-16 pb-8 mt-16">
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        <div>
                            <Link to="/" className="text-2xl font-black tracking-tight text-slate-900 no-underline mb-4 inline-block">HAMONI<span className="text-rose-500"></span></Link>
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">Đánh thức vẻ đẹp nguyên bản của bạn bằng tinh túy từ thiên nhiên. Sản phẩm an toàn, lành tính và hiệu quả.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Liên kết nhanh</h4>
                            <ul className="space-y-3 pl-0 mb-0 text-sm text-slate-500">
                                <li><Link to="/about" className="hover:text-rose-500 no-underline transition-colors">Về chúng tôi</Link></li>
                                <li><Link to="/privacy" className="hover:text-rose-500 no-underline transition-colors">Chính sách bảo mật</Link></li>
                                <li><Link to="/terms" className="hover:text-rose-500 no-underline transition-colors">Điều khoản dịch vụ</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Hỗ trợ khách hàng</h4>
                            <ul className="space-y-3 pl-0 mb-0 text-sm text-slate-500">
                                <li><Link to="/help" className="hover:text-rose-500 no-underline transition-colors">Trung tâm trợ giúp</Link></li>
                                <li><Link to="/guide" className="hover:text-rose-500 no-underline transition-colors">Hướng dẫn mua hàng</Link></li>
                                <li><Link to="/return-policy" className="hover:text-rose-500 no-underline transition-colors">Chính sách đổi trả</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Đăng ký nhận tin</h4>
                            <p className="text-sm text-slate-500 mb-4">Nhận ngay voucher 50K cho đơn hàng đầu tiên khi đăng ký email.</p>
                            <div className="flex gap-2">
                                <input type="email" placeholder="Email của bạn..." className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-rose-300" />
                                <button className="bg-slate-900 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Gửi</button>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 pt-8 text-center text-sm text-slate-400">
                        © 2026 Hamoni Cosmetic. Khóa luận tốt nghiệp nhóm 96.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ClientLayout;