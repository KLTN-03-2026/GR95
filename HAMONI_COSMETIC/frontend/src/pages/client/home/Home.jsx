import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Filter, RefreshCcw, AlertCircle, Leaf, ShieldCheck, Truck, Sparkles, ArrowRight, Zap, Flame, Droplets } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';

// ==========================================
// COMPONENT: HERO SLIDER
// ==========================================
const HeroSlider = ({ slides }) => {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    
    useEffect(() => {
        if (!slides || slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
        }, 5000);
        return () => clearInterval(timer);
    }, [current, slides]);

    const nextSlide = (e) => { e.stopPropagation(); setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1)); };
    const prevSlide = (e) => { e.stopPropagation(); setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1)); };

    if (!slides || slides.length === 0) return null;

    const activeSlide = slides[current] || {};
    const slideTitle = activeSlide.title || 'Khám phá bộ sưu tập mới nhất';
    const slideSubtitle = activeSlide.subtitle || 'Xem ngay các xu hướng và ưu đãi nổi bật đang chờ bạn.';
    const slideBadge = activeSlide.badge || '';

    return (
        <div
            className="relative w-full h-[250px] md:h-[480px] rounded-3xl overflow-hidden bg-slate-100 group shadow-md cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence initial={false}>
                <Motion.div 
                    key={current} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    transition={{ duration: 0.8, ease: "easeInOut" }} 
                    className="absolute inset-0"
                >
                    <img src={activeSlide.image} alt={slideTitle} className="w-full h-full object-cover" />
                </Motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 z-10 flex flex-col justify-end px-8 md:px-16 pb-12 pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent transition-opacity duration-500 ease-out z-[-1] ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

                <div className={`transition-all duration-500 ease-out delay-75 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    {slideBadge && (
                        <span className="inline-block bg-rose-500 text-white font-bold uppercase tracking-wider mb-3 px-3 py-1 rounded text-xs shadow-md">
                            {slideBadge}
                        </span>
                    )}
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black mb-4 max-w-2xl leading-tight text-white">
                        {slideTitle}
                    </h2>
                    <p className="text-slate-200 mb-6 max-w-lg text-sm md:text-base leading-relaxed">
                        {slideSubtitle}
                    </p>
                    <button className="pointer-events-auto w-max bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-full text-base font-bold shadow-lg shadow-rose-500/40 transition-transform hover:-translate-y-1">
                        {activeSlide.cta || 'Khám phá ngay'}
                    </button>
                </div>
            </div>

            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"><ChevronLeft size={24} /></button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-3 rounded-full backdrop-blur transition-all opacity-0 group-hover:opacity-100 shadow-lg z-20"><ChevronRight size={24} /></button>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, idx) => (
                    <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrent(idx); }} className={`w-2 h-2 rounded-full transition-all ${idx === current ? 'bg-rose-500 w-6' : 'bg-white/50 hover:bg-white pointer-events-auto'}`} />
                ))}
            </div>
        </div>
    );
};

// ==========================================
// LOGIC XỬ LÝ DỮ LIỆU
// ==========================================

const checkIsNewProduct = (dateString) => {
    if (!dateString) return false;
    const createdDate = new Date(dateString);
    if (Number.isNaN(createdDate.getTime())) return false;
    const today = new Date();
    const diffTime = today - createdDate;
    if (diffTime < 0) return false;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
};

const getDiscountPercent = (price, oldPrice) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
};

const normalizeProducts = (products = []) => {
    return products.map((product, index) => {
        const defaultPrice = Number(product.price) || 0;
        const defaultOldPrice = Number(product.oldPrice) || null;

        const normalizedVariants = Array.isArray(product.variants) && product.variants.length > 0
            ? product.variants.map((variant, variantIndex) => ({
                id: variant.id || `${product.id || index}-v${variantIndex + 1}`,
                label: variant.label || variant.name || `Biến thể ${variantIndex + 1}`,
                type: variant.type || 'Tùy chọn',
                // Nếu API biến thể không trả cặp giá trước/sau giảm,
                // dùng giá tổng hợp ở cấp sản phẩm để không mất thông tin khuyến mãi.
                price: (variant.oldPrice != null || variant.originalPrice != null || variant.effectivePrice != null)
                    ? (Number(variant.effectivePrice ?? variant.price) || defaultPrice)
                    : defaultPrice,
                oldPrice: (variant.oldPrice != null || variant.originalPrice != null || variant.effectivePrice != null)
                    ? (Number(variant.oldPrice ?? variant.originalPrice) || defaultOldPrice)
                    : defaultOldPrice,
                inStock: variant.inStock !== false,
                image: variant.image || product.image
            }))
            : [{
                id: `${product.id || index}-default`,
                label: 'Tiêu chuẩn',
                type: 'Tùy chọn',
                price: defaultPrice,
                oldPrice: defaultOldPrice,
                inStock: product.inStock !== false,
                image: product.image
            }];

        const isNew = checkIsNewProduct(product.createdAt || product.NgayTao || product.created_at);
        const primaryVariant = normalizedVariants[0] || {};
        const basePrice = Number(primaryVariant.price) || defaultPrice;
        const baseOldPrice = Number(primaryVariant.oldPrice) || defaultOldPrice;
        const discountPercent = getDiscountPercent(basePrice, baseOldPrice);

        return {
            id: product.id || product.MaSP,
            name: product.name || product.TenSP,
            brand: product.brand || product.thuongHieu,
            category: product.category || product.TenDM,
            image: product.image || normalizedVariants[0].image,
            price: defaultPrice,
            oldPrice: defaultOldPrice,
            rating: Number(product.rating) || 5,
            reviews: Number(product.reviews) || 0,
            soldCount: Number(product.soldCount) || 0,
            isNew: isNew,
            discountPercent: discountPercent,
            variants: normalizedVariants,
            badges: product.badges || []
        };
    });
};

// ==========================================
// COMPONENT: THẺ SẢN PHẨM (Clean & Minimal)
// ==========================================
const ProductCard = ({ product }) => {
    const navigate = useNavigate();

    const defaultVariant = product.variants?.[0] || {};
    const displayPrice = Number(defaultVariant.price) || Number(product.price) || 0;
    const displayOldPrice = Number(defaultVariant.oldPrice) || Number(product.oldPrice) || null;
    const discountPercent = product.discountPercent;
    const displayImage = defaultVariant.image || product.image;

    const formatPrice = (price) => (price ? Number(price).toLocaleString('vi-VN') + 'đ' : 'Liên hệ');

    // Chuyển trang khi click vào ảnh hoặc tên
    const handleNavigate = () => {
        navigate(`/product/${product.id}`); 
    };

    return (
        <Motion.article 
            whileHover={{ y: -6 }} 
            className="group bg-white rounded-2xl p-3 border border-rose-100/50 hover:border-rose-200 hover:shadow-[0_12px_30px_rgba(191,124,124,0.12)] transition-all duration-300 flex flex-col h-full relative overflow-hidden"
        >
            {/* Nhãn dán NEW / Giảm giá */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
                {product.isNew && (
                    <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
                        NEW
                    </span>
                )}
                {discountPercent > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
                        -{discountPercent}%
                    </span>
                )}
            </div>

            {/* Container Hình ảnh */}
            <div 
                className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-slate-50 flex items-center justify-center cursor-pointer"
                onClick={handleNavigate}
            >
                <img src={displayImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
            </div>

            {/* Thông tin sản phẩm */}
            <div className="mt-auto flex flex-col flex-1 px-1">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 truncate pr-2">{product.brand}</span>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{product.category}</span>
                </div>

                <p 
                    className="font-bold text-slate-800 text-[15px] leading-relaxed line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors cursor-pointer"
                    onClick={handleNavigate}
                >
                    {product.name}
                </p>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-700">{product.rating?.toFixed(1) || '5.0'}</span>
                    <span>({product.reviews || 0})</span>
                </div>

                <div className="mt-auto pt-2.5 border-t border-slate-100">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className="text-base font-black text-rose-600 leading-none">{formatPrice(displayPrice)}</span>
                            {displayOldPrice > displayPrice && (
                                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">{formatPrice(displayOldPrice)}</span>
                            )}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${defaultVariant?.inStock !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            {defaultVariant?.inStock !== false ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                    </div>
                </div>
            </div>
        </Motion.article>
    );
};

const ProductSkeleton = () => (
    <div className="bg-white p-3 rounded-2xl border border-slate-100">
        <div className="w-full aspect-[4/5] bg-slate-100 rounded-xl mb-3 animate-pulse"></div>
        <div className="h-3 bg-slate-100 rounded w-3/4 mb-2 animate-pulse"></div>
        <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse mt-auto"></div>
    </div>
);

// ==========================================
// MAIN PAGE
// ==========================================
export default function Home() {
    const [data, setData] = useState({ slides: [], products: [] });
    const [dbCategories, setDbCategories] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [maxPrice, setMaxPrice] = useState(2000000);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedBrand, setSelectedBrand] = useState('all');

    // KẾT NỐI DỮ LIỆU THẬT
    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const [homeResult, categoryResult] = await Promise.all([
                    axiosClient.get('/home'),
                    axiosClient.get('/categories')
                ]);

                const fromApi = normalizeProducts(homeResult.products || []);
                setData({
                    slides: homeResult.slides || [],
                    products: fromApi
                });
                
                setDbCategories(categoryResult || []);
            } catch (err) {
                console.error('Lỗi Fetch Data:', err);
                setError('Hệ thống đang bảo trì hoặc lỗi kết nối. Vui lòng thử lại sau.');
                setData({ slides: [], products: [] }); 
            } finally {
                setLoading(false);
            }
        };
        fetchHomeData();
    }, []);

    const brands = ['all', ...new Set((data.products || []).map((p) => p.brand).filter(Boolean))];

    const handleResetFilter = () => {
        setMaxPrice(2000000);
        setSelectedCategory('all');
        setSelectedBrand('all');
    };

    // Lọc dữ liệu tổng
    const filteredProducts = data.products?.filter((product) => {
        const minVariantPrice = Math.min(...product.variants.map((v) => Number(v.price) || 0));
        const matchPrice = minVariantPrice <= maxPrice;
        const matchCategory = selectedCategory === 'all' || product.category === selectedCategory;
        const matchBrand = selectedBrand === 'all' || product.brand === selectedBrand;
        return matchPrice && matchCategory && matchBrand;
    });

    // PHÂN LOẠI SẢN PHẨM THÀNH CÁC SECTIONS (Tối đa 8 sản phẩm / mục)
    const todaySuggestionProducts = filteredProducts
        .filter((product) => product.isNew || product.discountPercent > 0)
        .slice(0, 8);
    const featuredProducts = [...filteredProducts]
        .filter((product) => (product.soldCount || 0) > 0)
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .slice(0, 8);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
                    <AlertCircle size={20} /> <p>{error}</p>
                </div>
            )}  

            {/* HERO SLIDER */}
            <div className="mb-6 shadow-sm">
                {loading ? <div className="w-full h-[250px] md:h-[480px] bg-slate-100 rounded-3xl animate-pulse"></div> : <HeroSlider slides={data.slides} />}
            </div>

            {/* THANH BỘ LỌC NGANG */}
            <div className="bg-white p-4 md:px-6 md:py-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sticky top-[var(--client-nav-offset)] z-30">
                <div className="flex items-center gap-3 flex-wrap w-full">
                    <div className="flex items-center gap-2 text-rose-500 font-bold mr-2">
                        <Filter size={20} /> <span className="hidden md:inline text-slate-800 text-base">Bộ lọc:</span>
                    </div>

                    <div className="flex-1 min-w-[140px] max-w-[200px]">
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 cursor-pointer">
                            <option value="all">Tất cả danh mục</option>
                            {dbCategories.map((item) => (
                                <option key={item.id || item.MaDM} value={item.name || item.TenDM}>
                                    {item.name || item.TenDM}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[140px] max-w-[200px]">
                        <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 cursor-pointer">
                            {brands.map((item) => (
                                <option key={item} value={item}>{item === 'all' ? 'Tất cả thương hiệu' : item}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 min-w-[260px] max-w-[350px]">
                        <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">Giá tới:</span>
                        <input type="range" min="0" max="2000000" step="50000" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                        <span className="text-sm font-bold text-rose-600 whitespace-nowrap w-20 text-right">{maxPrice.toLocaleString('vi-VN')}đ</span>
                    </div>

                    <button onClick={handleResetFilter} className="ml-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold transition-colors w-full lg:w-auto">
                        <RefreshCcw size={16} /> Làm mới
                    </button>
                </div>
            </div>

            {/* VÙNG HIỂN THỊ CÁC SECTION SẢN PHẨM */}
            <div className="w-full mb-10 space-y-10">
                
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                ) : (
                    <>
                        {/* 1. GỢI Ý HÔM NAY (GỘP NEW + SALE) */}
                        {todaySuggestionProducts.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Sparkles size={28} className="text-amber-400" />
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Gợi Ý Hôm Nay</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-4">
                                    {todaySuggestionProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2. SẢN PHẨM NỔI BẬT (SẮP XẾP THEO ĐÃ BÁN) */}
                        {featuredProducts.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Flame size={28} className="text-rose-500" />
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Sản Phẩm Nổi Bật</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                    {featuredProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* THÔNG BÁO KHÔNG TÌM THẤY */}
                        {filteredProducts.length === 0 && !error && (
                            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                <p className="text-slate-600 text-lg font-medium mb-4">Không tìm thấy sản phẩm phù hợp với bộ lọc.</p>
                                <button onClick={handleResetFilter} className="text-white bg-rose-500 hover:bg-rose-600 px-8 py-3 rounded-xl font-bold text-base transition-all shadow-lg shadow-rose-500/30">
                                    Xóa bộ lọc ngay
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* NÚT XEM THÊM SẢN PHẨM */}
                {!loading && filteredProducts?.length > 0 && (
                    <div className="mt-10 text-center">
                        <Link to="/products" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-full font-bold transition-colors group">
                            Xem tất cả sản phẩm
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* SECTION: TRIẾT LÝ LÀM ĐẸP */}
            {/* ========================================== */}
            <section className="py-16 bg-rose-50/50 rounded-3xl border border-rose-100/50 shadow-sm overflow-hidden mb-8">
                <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center px-8 lg:px-16">
                    <div className="relative h-[400px] rounded-2xl overflow-hidden bg-slate-100 group">
                        <img 
                            src="https://bizweb.dktcdn.net/thumb/1024x1024/100/413/259/files/my-pham-thien-nhien-8-jpeg.jpg?v=1674563308361" 
                            alt="Triết lý Hamoni" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <p className="text-white text-lg font-bold">Nâng niu làn da từ những điều thuần khiết nhất.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-rose-600 font-bold text-xs uppercase tracking-wider shadow-sm">
                            <Droplets size={14} /> Triết lý của chúng tôi
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
                            Sự kết hợp hoàn hảo giữa <br className="hidden lg:block"/><span className="text-rose-500">Thiên nhiên & Khoa học</span>.
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-base">
                            Mỗi sản phẩm của Hamoni không chỉ là mỹ phẩm, mà là một lời hứa về chất lượng. Chúng tôi tuyển chọn khắt khe từng thành phần thảo mộc, kết hợp cùng các hoạt chất da liễu tiên tiến để tạo ra những công thức độc quyền.
                        </p>
                        <p className="text-slate-600 leading-relaxed text-base">
                            Hamoni hướng tới một quy trình Skincare tối giản nhưng mang lại hiệu quả tối đa, giúp bạn tự tin tỏa sáng với làn da mộc rạng rỡ và khỏe khoắn từ sâu bên trong.
                        </p>
                        <div className="pt-2">
                            <Link to="/about" className="inline-flex items-center gap-2 text-rose-600 font-bold hover:text-rose-700 transition-colors group">
                                Khám phá câu chuyện thương hiệu
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================== */}
            {/* SECTION: VỀ HAMONI COSMETIC */}
            {/* ========================================== */}
            <section className="py-16 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-8">
                <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center px-8 lg:px-16">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 font-bold text-xs uppercase tracking-wider">
                            <Sparkles size={14} /> Về Hamoni Cosmetic
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
                            Đánh thức vẻ đẹp <span className="text-rose-500">nguyên bản</span> của bạn.
                        </h2>
                        <p className="text-slate-600 leading-relaxed text-base">
                            Tại Hamoni, chúng tôi tin rằng vẻ đẹp thực sự bắt nguồn từ sự khỏe mạnh của làn da. Bằng việc chắt lọc những tinh túy thuần khiết nhất từ thiên nhiên, kết hợp cùng công nghệ làm đẹp tiên tiến, Hamoni mang đến những giải pháp chăm sóc sắc đẹp an toàn, hiệu quả và bền vững.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                    <Leaf size={20} />
                                </div>
                                <span className="font-bold text-sm text-slate-800">100% Nguồn gốc<br/>Thiên nhiên</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={20} />
                                </div>
                                <span className="font-bold text-sm text-slate-800">An toàn &<br/>Lành tính</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                                    <Truck size={20} />
                                </div>
                                <span className="font-bold text-sm text-slate-800">Giao hàng<br/>Toàn quốc</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                                    <Star size={20} />
                                </div>
                                <span className="font-bold text-sm text-slate-800">Cam kết<br/>Chính hãng</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative h-[400px] rounded-2xl overflow-hidden bg-slate-100 group">
                        <img 
                            src="https://myphamcacdai.vn/upload/ckfinder/images/q1(1).jpg" 
                            alt="Hamoni Cosmetic Store" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <p className="text-white text-lg font-bold">Chăm sóc sắc đẹp bằng cả trái tim.</p>
                        </div>
                    </div>
                </div>  
            </section>
        </div>
    );
}