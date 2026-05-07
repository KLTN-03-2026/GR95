import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { Star, AlertTriangle, Clock, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../../../services/axiosClient';
import './PromotionDetailClient.css';

// ==========================================
// 1. LOGIC XỬ LÝ DỮ LIỆU (Y CHANG TRANG HOME 100%)
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
        
        // KIỂM TRA TỒN KHO THÔNG MINH
        const rawStock = product?.stock ?? product?.soLuongTon ?? product?.SoLuongTon ?? product?.SoLuong ?? product?.soluong ?? product?.tonKho ?? product?.TonKho;
        
        let hasProductStock = true; // Mặc định cứu cánh giao diện nếu API thiếu cột
        if (rawStock !== undefined && rawStock !== null) {
            hasProductStock = Number(rawStock) > 0;
        } else if (product?.inStock !== undefined || product?.TrangThai !== undefined) {
             const inStockVal = product?.inStock ?? product?.TrangThai;
             hasProductStock = inStockVal === true || inStockVal === 1 || inStockVal === '1' || inStockVal === 'Còn hàng';
        }

        // CẤU TRÚC BIẾN THỂ Y HỆT TRANG HOME
        const normalizedVariants = Array.isArray(product.variants) && product.variants.length > 0
            ? product.variants.map((variant, variantIndex) => {
                const rawVStock = variant?.stock ?? variant?.soLuongTon ?? variant?.SoLuongTon ?? variant?.SoLuong ?? variant?.soluong ?? variant?.tonKho ?? variant?.TonKho;
                
                let hasVStock = true;
                if (rawVStock !== undefined && rawVStock !== null) {
                    hasVStock = Number(rawVStock) > 0;
                } else if (variant?.inStock !== undefined || variant?.TrangThai !== undefined) {
                     const vInStockVal = variant?.inStock ?? variant?.TrangThai;
                     hasVStock = vInStockVal === true || vInStockVal === 1 || vInStockVal === '1' || vInStockVal === 'Còn hàng';
                }

                return {
                    id: variant.id || `${product.id || index}-v${variantIndex + 1}`,
                    label: variant.label || variant.name || `Biến thể ${variantIndex + 1}`,
                    type: variant.type || 'Tùy chọn',
                    price: (variant.oldPrice != null || variant.originalPrice != null || variant.effectivePrice != null)
                        ? (Number(variant.effectivePrice ?? variant.price) || defaultPrice) : defaultPrice,
                    oldPrice: (variant.oldPrice != null || variant.originalPrice != null || variant.effectivePrice != null)
                        ? (Number(variant.oldPrice ?? variant.originalPrice) || defaultOldPrice) : defaultOldPrice,
                    stock: Number(rawVStock || 0),
                    inStock: hasVStock,
                    image: variant.image || product.image || product.HinhAnh
                };
            })
            : [{
                id: `${product.id || index}-default`,
                label: 'Tiêu chuẩn',
                type: 'Tùy chọn',
                price: defaultPrice,
                oldPrice: defaultOldPrice,
                stock: Number(rawStock || 0),
                inStock: hasProductStock,
                image: product.image || product.HinhAnh
            }];

        const isNew = checkIsNewProduct(product.createdAt || product.NgayTao || product.created_at);
        const primaryVariant = normalizedVariants[0] || {};
        const basePrice = Number(primaryVariant.price) || defaultPrice;
        const baseOldPrice = Number(primaryVariant.oldPrice) || defaultOldPrice;
        const discountPercent = getDiscountPercent(basePrice, baseOldPrice);
        const totalStock = normalizedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

        return {
            id: product.id || product.MaSP,
            name: product.name || product.TenSP,
            brand: product.brand || product.thuongHieu,
            category: product.category || product.TenDM || 'Chăm sóc da',
            image: product.image || product.HinhAnh || normalizedVariants[0].image,
            price: defaultPrice,
            oldPrice: defaultOldPrice,
            rating: Number(product.rating) || 5,
            reviews: Number(product.reviews) || 0,
            soldCount: Number(product.DaBan || product.daBan || product.soldCount || 0), 
            totalStock: totalStock,
            isNew: isNew,
            discountPercent: discountPercent,
            variants: normalizedVariants, // GIỮ NGUYÊN MẢNG NÀY ĐỂ PRODUCT CARD ĐỌC
            badges: product.badges || []
        };
    });
};

// ==========================================
// 2. GIAO DIỆN THẺ SẢN PHẨM (ĐÃ TRẢ VỀ CHUẨN HOME)
// ==========================================
const ProductCard = ({ product, isUpcoming, isExpired }) => {
    const navigate = useNavigate();

    const defaultVariant = product.variants?.[0] || {};
    const displayPrice = Number(defaultVariant.price) || Number(product.price) || 0;
    const displayOldPrice = Number(defaultVariant.oldPrice) || Number(product.oldPrice) || null;
    const discountPercent = product.discountPercent;
    const displayImage = defaultVariant.image || product.image;
    
    // ĐÚNG CÂU LỆNH CỦA TRANG HOME: Kiểm tra trong mảng variants
    const hasAnyVariantInStock = product.variants?.some(v => v.inStock);

    const formatPrice = (price) => {
        if (!price) return 'Liên hệ';
        return Number(price).toLocaleString('vi-VN') + 'đ';
    };

    const handleNavigate = () => {
        if (!isExpired) navigate(`/product/${product.id}`); 
    };

    return (
        <Motion.article 
            whileHover={!isExpired ? { y: -6 } : {}} 
            className={`group bg-white rounded-2xl p-3 border border-rose-100/50 hover:border-rose-200 hover:shadow-[0_12px_30px_rgba(191,124,124,0.12)] transition-all duration-300 flex flex-col h-full relative overflow-hidden ${isExpired ? 'promo-expired-card' : ''}`}
        >
            {/* TAG TRẠNG THÁI */}
            {isExpired ? (
                <div className="absolute top-0 left-0 bg-slate-500 text-white font-bold text-[11px] px-3 py-1 rounded-br-xl z-10 shadow-sm">
                    HẾT HẠN
                </div>
            ) : (
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
                    {discountPercent > 0 && (
                        <span className={`${isUpcoming ? 'bg-slate-600' : 'bg-rose-500'} text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md`}>
                            {isUpcoming ? 'SẮP SALE ' : ''}-{discountPercent}%
                        </span>
                    )}
                    {product.isNew && discountPercent === 0 && (
                        <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
                            NEW
                        </span>
                    )}
                </div>
            )}

            {/* HÌNH ẢNH */}
            <div 
                className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 bg-slate-50 flex items-center justify-center cursor-pointer"
                onClick={handleNavigate}
            >
                <img src={displayImage} alt={product.name} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${isUpcoming || isExpired ? 'opacity-80' : ''}`} />
            </div>

            {/* THÔNG TIN SẢN PHẨM */}
            <div className="mt-auto flex flex-col flex-1 px-1">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500 truncate pr-2">{product.brand}</span>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{product.category}</span>
                </div>

                <p 
                    className="font-bold text-slate-800 text-[14px] sm:text-[15px] leading-relaxed line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors cursor-pointer"
                    onClick={handleNavigate}
                >
                    {product.name}
                </p>

                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-700">{product.rating?.toFixed(1) || '5.0'}</span>
                    <span>({product.reviews || 0})</span>
                </div>

                {/* KHỐI GIÁ & TÌNH TRẠNG KHO */}
                <div className="mt-auto pt-2.5 border-t border-slate-100">
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col">
                            <span className={`text-[15px] sm:text-[16px] font-black leading-none ${isUpcoming ? 'text-slate-600' : 'text-rose-600'}`}>
                                {formatPrice(displayPrice)}
                            </span>
                            {(!isExpired && displayOldPrice > displayPrice) && (
                                <span className="text-[10px] font-medium text-slate-400 line-through mt-1.5 leading-none">
                                    {formatPrice(displayOldPrice)}
                                </span>
                            )}
                        </div>
                        
                        {!isExpired && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${hasAnyVariantInStock ? 'text-emerald-500 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                                {hasAnyVariantInStock ? 'Còn hàng' : 'Hết hàng'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Motion.article>
    );
};

// ==========================================
// 3. MAIN PAGE KHUYẾN MÃI CHI TIẾT
// ==========================================
export default function PromotionDetailClient() {
    const { id } = useParams(); 
    const [products, setProducts] = useState([]);
    const [promoData, setPromoData] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [sortType, setSortType] = useState('default');

    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 10; 

    useEffect(() => {
        const fetchPromoProducts = async () => {
            try {
                const res = await axiosClient.get(`/promotions/${id}/products`);
                setProducts(normalizeProducts(res.products)); 
                if (res.promotion) {
                    setPromoData(res.promotion); 
                }
            } catch (error) {
                console.error("Lỗi lấy sản phẩm khuyến mãi:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPromoProducts();
    }, [id]);

    const now = new Date();
    const startDate = promoData ? new Date(promoData.NgayBatDau) : now;
    const endDate = promoData ? new Date(promoData.NgayKetThuc) : now;

    const isUpcoming = promoData && now < startDate;
    const isExpired = promoData && now > endDate;

    const formatDateTime = (dateObj) => {
        return dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ngày ' + dateObj.toLocaleDateString('vi-VN');
    };

    const sortedProducts = [...products].sort((a, b) => {
        if (sortType === 'default') {
            if (b.soldCount !== a.soldCount) return b.soldCount - a.soldCount; 
            return b.rating - a.rating; 
        }
        const priceA = Number(a.variants?.[0]?.price) || Number(a.price) || 0;
        const priceB = Number(b.variants?.[0]?.price) || Number(b.price) || 0;
        if (sortType === 'asc') return priceA - priceB;
        if (sortType === 'desc') return priceB - priceA;
        return 0;
    });

    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct); 
    const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 min-h-screen bg-[#FAFAFA]">
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-rose-500"></div>
                </div>
            ) : (
                <>
                    {/* BANNER 1: CHƯƠNG TRÌNH CHƯA BẮT ĐẦU */}
                    {isUpcoming && (
                        <Motion.div 
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-[#FFFDF4] border border-[#FDE047] px-6 py-6 md:py-8 rounded-[16px] mb-12 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-sm max-w-4xl mx-auto"
                        >
                            <div className="w-14 h-14 bg-[#FEF0C7] rounded-full flex items-center justify-center text-[#D97706] shrink-0">
                                <Clock size={28} strokeWidth={2} />
                            </div>
                            <div className="text-center md:text-left flex-1 w-full">
                                <h3 className="font-normal text-[17px] text-[#334155] mb-4 flex items-center justify-center md:justify-start gap-2">
                                    <AlertTriangle size={18} className="text-[#EAB308]" strokeWidth={2} /> 
                                    Chương trình chưa bắt đầu!
                                </h3>
                                <div className="h-[1px] bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent md:from-[#E2E8F0] md:via-[#E2E8F0] md:to-transparent w-full mb-4"></div>
                                <div className="space-y-1">
                                    <p className="text-[14px] sm:text-[15px] text-[#A16207]">
                                        Khuyến mãi sẽ chính thức mở bán vào lúc <span className="bg-[#FEF0C7] text-[#92400E] font-medium px-2 py-0.5 rounded mx-1">{formatDateTime(startDate)}</span>
                                    </p>
                                    <p className="text-[14px] sm:text-[15px] text-[#A16207]">
                                        Giá bên dưới là <strong className="text-[#DC2626] font-bold">GIÁ XEM TRƯỚC</strong>.
                                    </p>
                                </div>
                            </div>
                        </Motion.div>
                    )}

                    {/* BANNER 2: CHƯƠNG TRÌNH ĐÃ KẾT THÚC */}
                    {isExpired && (
                        <Motion.div 
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-slate-100 border border-slate-300 px-6 py-6 md:py-8 rounded-[16px] mb-12 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-sm max-w-4xl mx-auto"
                        >
                            <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 shrink-0">
                                <Info size={28} strokeWidth={2} />
                            </div>
                            <div className="text-center md:text-left flex-1 w-full">
                                <h3 className="font-normal text-[17px] text-slate-700 mb-4 flex items-center justify-center md:justify-start gap-2">
                                    Chương trình khuyến mãi đã kết thúc!
                                </h3>
                                <div className="h-[1px] bg-slate-200 w-full mb-4"></div>
                                <div className="space-y-1">
                                    <p className="text-[14px] sm:text-[15px] text-slate-500">
                                        Thời gian áp dụng đã hết vào lúc <span className="font-bold">{formatDateTime(endDate)}</span>. Sản phẩm đã quay về giá gốc ban đầu.
                                    </p>
                                </div>
                            </div>
                        </Motion.div>
                    )}

                    {/* THANH SẮP XẾP SẢN PHẨM */}
                    {products && products.length > 0 && (
                        <div className="bg-white border border-slate-200/60 rounded-[12px] p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
                            <h2 className="text-[18px] font-medium text-[#1E293B]">
                                Tất cả sản phẩm <span className="text-slate-500 text-sm font-normal">({products.length})</span>
                            </h2>
                            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                                <span className="text-[14px] text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => {setSortType('default'); setCurrentPage(1);}} className={`px-4 py-2 text-[14px] rounded-lg border whitespace-nowrap transition-colors ${sortType === 'default' ? 'border-[#1E293B] text-[#1E293B] font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Nổi bật</button>
                                    <button onClick={() => {setSortType('asc'); setCurrentPage(1);}} className={`px-4 py-2 text-[14px] rounded-lg border whitespace-nowrap transition-colors ${sortType === 'asc' ? 'border-[#1E293B] text-[#1E293B] font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Giá: Tăng dần</button>
                                    <button onClick={() => {setSortType('desc'); setCurrentPage(1);}} className={`px-4 py-2 text-[14px] rounded-lg border whitespace-nowrap transition-colors ${sortType === 'desc' ? 'border-[#1E293B] text-[#1E293B] font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Giá: Giảm dần</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RENDER LIST */}
                    {currentProducts && currentProducts.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                                {currentProducts.map((product, idx) => (
                                    <ProductCard 
                                        key={product.id || product.MaBienThe || idx} 
                                        product={product} 
                                        isUpcoming={isUpcoming} 
                                        isExpired={isExpired}
                                    />
                                ))}
                            </div>

                            {/* BỘ NÚT ĐIỀU HƯỚNG PHÂN TRANG */}
                            {totalPages > 0 && (
                                <div className="mt-12 flex justify-center items-center gap-2">
                                    <button 
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    
                                    {[...Array(totalPages)].map((_, index) => (
                                        <button
                                            key={index + 1}
                                            onClick={() => handlePageChange(index + 1)}
                                            className={`w-10 h-10 rounded-lg border font-bold transition-all shadow-sm ${currentPage === index + 1 ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-500 hover:text-rose-500'}`}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}

                                    <button 
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                            <p className="text-slate-500 text-lg">Hiện chưa có chương trình ưu đãi nào.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}