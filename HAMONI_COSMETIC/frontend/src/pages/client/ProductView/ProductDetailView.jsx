import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import productApi from '../../../services/productApi';
import shoppingCartApi from '../../../services/shoppingCartApi';
import './ProductDetailView.css';

const PRODUCT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&h=800&fit=crop';

const ProductDetailView = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showCartAddedPopup, setShowCartAddedPopup] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [quantityInput, setQuantityInput] = useState('1');

  const popupTimerRef = useRef(null);

  const images = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      return [PRODUCT_FALLBACK_IMAGE];
    }
    return product.images;
  }, [product]);

  const variantOptions = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return [];

    const variantType = detectVariantType(product.variants);

    return product.variants.map((variant, index) => {
      const stock = Number(variant.SoLuongTon ?? product.stock ?? 0);
      const price = Number(
        variant.GiaBan ?? variant.giaBan ?? variant.Gia ?? variant.gia ?? (product.price || 0)
      );
      const oldPrice = variant.GiaGoc ?? variant.giaGoc ?? null;

      return {
        id: variant.MaBienThe,
        name: variant.TenBienThe || `Biến thể ${index + 1}`,
        price,
        oldPrice: oldPrice !== null && oldPrice !== undefined ? Number(oldPrice) : null,
        stock,
        imageIndex: index % images.length,
        displayName: getVariantDisplayName(variant.TenBienThe, variantType, index + 1)
      };
    });
  }, [images.length, product]);

  const variantType = useMemo(() => detectVariantType(product?.variants || []), [product]);
  const variantLabel = variantType === 'weight' ? 'Khối lượng' : 'Màu sắc';

  const selectedVariant = useMemo(() => {
    if (variantOptions.length === 0) return null;
    return variantOptions.find((variant) => variant.id === selectedVariantId) || variantOptions[0];
  }, [selectedVariantId, variantOptions]);

  const availableStock = selectedVariant ? selectedVariant.stock : product?.stock || 0;
  const displayPrice = selectedVariant ? selectedVariant.price : product?.price || 0;
  const displayOldPrice = selectedVariant ? selectedVariant.oldPrice : product?.oldPrice || null;

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (productId) {
      sessionStorage.setItem('lastProductPageId', String(productId));
    }

    const loadProductData = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const detailRes = await productApi.getPublicDetail(productId);

        const info = detailRes?.info || {};
        const detailImages = (detailRes?.images || [])
          .map((item) => item.DuongDanAnh)
          .filter(Boolean);

        setProduct({
          id: info.MaSP,
          name: info.TenSP || 'Sản phẩm',
          price: Number(info.GiaBan || 0),
          oldPrice: info.GiaGoc !== undefined && info.GiaGoc !== null ? Number(info.GiaGoc) : null,
          rating: Number(info.SoSaoTB || 0),
          reviewCount: Number(info.LuotDanhGia || 0),
          stock: Number(info.SoLuongTon || 0),
          description: info.MoTa || 'Sản phẩm chưa có mô tả.',
          ingredients: info.ThanhPhan || 'Đang cập nhật.',
          usage: info.CachSuDung || 'Đang cập nhật.',
          brand: 'HAMONI',
          origin: 'Việt Nam',
          variants: detailRes?.variants || [],
          images: detailImages
        });

        try {
          const reviewsRes = await productApi.getProductReviews(productId, { limit: 4 });
          const mappedReviews = (reviewsRes || []).map((item) => ({
            id: item.MaDG,
            customerName: item.HoTen || 'Khách hàng',
            rating: Number(item.SoSao || 0),
            comment: item.BinhLuan || '',
            date: formatDate(item.NgayDanhGia),
            avatar: `https://ui-avatars.com/api/?background=e5e7eb&color=111827&name=${encodeURIComponent(item.HoTen || 'KH')}`
          }));
          setReviews(mappedReviews);
        } catch (reviewsError) {
          console.warn('Không tải được đánh giá:', reviewsError);
          setReviews([]);
        }

        try {
          const suggestedRes = await productApi.getSuggestedProducts(productId, { limit: 4 });
          const mappedSuggested = (suggestedRes || []).map((item) => ({
            id: item.MaSP,
            name: item.TenSP || 'Sản phẩm',
            price: Number(item.GiaBan || 0),
            rating: Number(item.SoSaoTB || 0),
            image: item.AnhChinh || PRODUCT_FALLBACK_IMAGE
          }));
          setSuggestedProducts(mappedSuggested);
        } catch (suggestedError) {
          console.warn('Không tải được sản phẩm gợi ý:', suggestedError);
          setSuggestedProducts([]);
        }

        setQuantity(1);
        setQuantityInput('1');
        setSelectedImageIndex(0);
        const firstAvailableVariant = (detailRes?.variants || []).find(
          (variant) => Number(variant.SoLuongTon || 0) > 0
        );
        setSelectedVariantId(
          firstAvailableVariant?.MaBienThe || detailRes?.variants?.[0]?.MaBienThe || null
        );
      } catch (error) {
        console.error('Lỗi tải chi tiết sản phẩm:', error);
        toast.error('Không thể tải chi tiết sản phẩm từ MySQL.');
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId]);

  const handleQuantityChange = (step) => {
    if (!product) return;
    const maxStock = Math.max(1, availableStock);
    setQuantity((prev) => {
      const nextQty = Math.max(1, Math.min(maxStock, Number(prev) + step));
      setQuantityInput(String(nextQty));
      return nextQty;
    });
  };

  const handleQuantityInputChange = (event) => {
    if (!product) return;

    const rawValue = event.target.value;
    const numericText = String(rawValue).replace(/\D/g, '');
    const maxStock = Math.max(1, availableStock);

    if (!numericText) {
      setQuantityInput('');
      return;
    }

    const parsedValue = Number.parseInt(numericText, 10);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    const nextValue = Math.max(1, Math.min(maxStock, parsedValue));
    setQuantityInput(String(nextValue));
    setQuantity(nextValue);
  };

  const handleQuantityInputBlur = () => {
    if (!product) return;

    const maxStock = Math.max(1, availableStock);
    const parsedValue = Number.parseInt(quantityInput, 10);
    const nextQty = Number.isNaN(parsedValue)
      ? 1
      : Math.max(1, Math.min(maxStock, parsedValue));

    setQuantity(nextQty);
    setQuantityInput(String(nextQty));
  };

  const handleSelectVariant = (variant) => {
    if (!variant || variant.stock <= 0) return;

    setSelectedVariantId(variant.id);
    setSelectedImageIndex(variant.imageIndex);
    setQuantity((prev) => {
      const nextQty = Math.max(1, Math.min(prev, variant.stock));
      setQuantityInput(String(nextQty));
      return nextQty;
    });
  };

  const getMaKhachHang = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.maND || user?.MaND || null;
  };

  const openCartAddedPopup = () => {
    setLastAddedItem({
      image: images[selectedImageIndex] || images[0] || PRODUCT_FALLBACK_IMAGE,
      name: product?.name || 'Sản phẩm',
      variant: selectedVariant?.displayName || '',
      quantity,
      price: displayPrice
    });
    setShowCartAddedPopup(true);

    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
    }

    popupTimerRef.current = setTimeout(() => {
      setShowCartAddedPopup(false);
    }, 2800);
  };

  const addToCart = async ({ showPopup = false } = {}) => {
    if (!product || isAddingToCart) return false;

    const parsedInputQuantity = Number.parseInt(quantityInput, 10);
    const maxStock = Math.max(1, availableStock);
    const nextQuantity = Number.isNaN(parsedInputQuantity)
      ? 1
      : Math.max(1, Math.min(maxStock, parsedInputQuantity));

    if (nextQuantity !== quantity) {
      setQuantity(nextQuantity);
    }
    setQuantityInput(String(nextQuantity));

    if (availableStock <= 0) {
      toast.error('Sản phẩm này đã hết hàng. Vui lòng chọn phân loại khác.');
      return false;
    }

    if (variantOptions.length > 0 && !selectedVariant) {
      toast.warning(`Vui lòng chọn ${variantLabel.toLowerCase()} trước khi thêm vào giỏ.`);
      return false;
    }

    const currentVariantId = selectedVariant?.id;
    if (!currentVariantId) {
      toast.warning('Sản phẩm này chưa có biến thể hợp lệ để thêm vào giỏ hàng.');
      return false;
    }

    const maKhachHang = getMaKhachHang();
    if (!maKhachHang) {
      toast.warning('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      navigate('/login');
      return false;
    }

    try {
      setIsAddingToCart(true);
      const response = await shoppingCartApi.addToCart({
        maKhachHang,
        maBienThe: currentVariantId,
        soLuong: nextQuantity
      });
      
      console.log('✅ addToCart response:', response);

      if (showPopup) {
        openCartAddedPopup();
      }

      toast.success(`Đã thêm ${nextQuantity} sản phẩm vào giỏ hàng`);
      return true;
    } catch (error) {
      const message = error?.response?.data?.message || 'Không thể thêm vào giỏ hàng. Vui lòng thử lại.';
      toast.error(message);
      return false;
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddToCart = async () => {
    await addToCart({ showPopup: true });
  };

  const handleBuyNow = async () => {
    const added = await addToCart();
    if (added) {
      navigate('/cart');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="spinner" />
          <p className="mt-3 text-slate-500">Đang tải dữ liệu sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-0 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">Không tìm thấy sản phẩm.</div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <div>
          <div className="image-gallery">
            <div className="main-image-container">
              <img src={images[selectedImageIndex]} alt={product.name} />
            </div>

            <div className="thumbnail-container">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="product-info">
            <div className="product-header">
              <h1 className="product-title">{product.name}</h1>

              <div className="rating-section">
                <div className="stars stars--brand">
                  {renderStars(product.rating)}
                </div>
                <span className="rating-summary">
                  {product.rating.toFixed(1)}/5 ({product.reviewCount} lượt đánh giá)
                </span>
              </div>

              <div>
                <div className="price-section">
                  <span className="current-price">{formatVnd(displayPrice)}đ</span>
                  {displayOldPrice && displayOldPrice > displayPrice && (
                    <>
                      <span className="original-price">{formatVnd(displayOldPrice)}đ</span>
                      <span className="discount-text">
                        Tiết kiệm {formatVnd(displayOldPrice - displayPrice)}đ
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded border-l-4 border-rose-200 bg-rose-50 p-3">
              <p className="mb-0 text-slate-600">{product.description}</p>
            </div>

            {variantOptions.length > 0 && (
              <div className="variant-selector">
                <div className="variant-selector-header">
                  <p className="variant-label">{variantLabel}</p>
                  {selectedVariant && (
                    <p className="variant-selected-text">Đã chọn: {selectedVariant.displayName}</p>
                  )}
                </div>

                <div className="variant-grid">
                  {variantOptions.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      className={`variant-item ${selectedVariant?.id === variant.id ? 'active' : ''} ${variant.stock <= 0 ? 'disabled' : ''}`}
                      onClick={() => handleSelectVariant(variant)}
                      disabled={variant.stock <= 0}
                    >
                      <img
                        src={images[variant.imageIndex] || images[0]}
                        alt={variant.displayName}
                        className="variant-item-image"
                      />
                      <span className="variant-item-name">{variant.displayName}</span>
                      {variant.stock <= 0 && <span className="variant-item-stock">Hết hàng</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="stock-status">
              <span className="stock-indicator" />
              <span className="stock-text">
                {availableStock > 0
                  ? `Còn hàng (${availableStock} sản phẩm)`
                  : 'Hết hàng'}
              </span>
            </div>

            <div className="quantity-selector">
              <div className="quantity-input">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={availableStock <= 0 || quantity <= 1}
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, availableStock)}
                  value={quantityInput}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  disabled={availableStock <= 0}
                  aria-label="Số lượng sản phẩm"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(1)}
                  disabled={availableStock <= 0 || quantity >= availableStock}
                >
                  +
                </button>
              </div>
              <small className="text-slate-500">Tối đa: {availableStock} sản phẩm</small>
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="btn-add-cart"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <ShoppingCart size={18} />
                {isAddingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
              </button>
              <button
                type="button"
                className="btn-buy-now"
                onClick={handleBuyNow}
                disabled={isAddingToCart}
              >
                Mua ngay
              </button>
            </div>

            <div className="product-details">
              <div className="detail-section">
                <h3>Thành phần</h3>
                <p>{product.ingredients}</p>
              </div>

              <div className="detail-section">
                <h3>Hướng dẫn sử dụng</h3>
                <p>{product.usage}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-box">
                  <p>Thương hiệu</p>
                  <p>{product.brand}</p>
                </div>
                <div className="detail-box">
                  <p>Xuất xứ</p>
                  <p>{product.origin}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section id="reviews" className="reviews-section">
        <div className="section-header section-header--stacked">
          <div>
            <h2 className="section-title">Đánh giá khách hàng</h2>
            <p className="section-subtitle">Phản hồi thực tế từ những người đã trải nghiệm.</p>
          </div>
          <a href="#all-reviews" className="section-link">
            Xem tất cả {product.reviewCount} đánh giá →
          </a>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Chưa có đánh giá nào.</div>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <article key={review.id} className="review-card">
                <div className="review-header">
                  <img
                    src={review.avatar}
                    alt={review.customerName}
                    className="reviewer-avatar"
                  />
                  <div className="reviewer-info">
                    <p className="reviewer-name mb-1">{review.customerName}</p>
                    <div className="review-meta">
                      <span className="review-stars">{renderStars(review.rating)}</span>
                      <span className="review-date">{review.date}</span>
                    </div>
                    <p className="review-text mb-0">{review.comment}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="suggested-section">
        <div className="section-header section-header--compact">
          <h2 className="section-title">Gợi ý cho bạn</h2>
        </div>

        {suggestedProducts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Không có sản phẩm gợi ý.</div>
        ) : (
          <div className="products-grid products-grid--featured">
            {suggestedProducts.map((item) => (
              <article
                key={item.id}
                className="product-card"
                onClick={() => navigate(`/product/${item.id}`)}
              >
                <div className="product-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <p className="product-name">{item.name}</p>
                <p className="product-price">{formatVnd(item.price)}đ</p>
              </article>
            ))}
          </div>
        )}
      </section>
      </div>

      {showCartAddedPopup && (
        <div className="cart-added-overlay" onClick={() => setShowCartAddedPopup(false)}>
          <div className="cart-added-popup" onClick={(event) => event.stopPropagation()}>
            <div className="cart-added-icon-wrap">
              <CheckCircle2 size={42} />
            </div>
            <p className="cart-added-title">Sản phẩm đã được thêm vào Giỏ hàng</p>

            {lastAddedItem && (
              <div className="cart-added-item">
                <img src={lastAddedItem.image} alt={lastAddedItem.name} />
                <div className="cart-added-item-info">
                  <p className="cart-added-item-name">{lastAddedItem.name}</p>
                  <p className="cart-added-item-meta">
                    {lastAddedItem.variant ? `${lastAddedItem.variant} • ` : ''}
                    SL: {lastAddedItem.quantity} • {formatVnd(lastAddedItem.price)}đ
                  </p>
                </div>
              </div>
            )}

            <div className="cart-added-actions">
              <button
                type="button"
                className="cart-added-btn cart-added-btn-secondary"
                onClick={() => setShowCartAddedPopup(false)}
              >
                Tiếp tục mua
              </button>
              <button
                type="button"
                className="cart-added-btn cart-added-btn-primary"
                onClick={() => {
                  setShowCartAddedPopup(false);
                  navigate('/cart');
                }}
              >
                Xem giỏ hàng
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
};

function renderStars(rating = 0, options = {}) {
  const { activeColor = '#f59e0b', inactiveColor = '#d1d5db' } = options;
  const filled = Math.round(rating);
  return Array.from({ length: 5 }, (_, index) => (
    <span key={index} style={{ color: index < filled ? activeColor : inactiveColor }}>
      ★
    </span>
  ));
}

function formatDate(dateValue) {
  if (!dateValue) return 'Vừa xong';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return date.toLocaleDateString('vi-VN');
}

function formatVnd(value = 0) {
  return Number(value).toLocaleString('vi-VN');
}

function getVariantDisplayName(name = '', variantType = 'color', fallbackIndex = 1) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName) {
    return variantType === 'weight'
      ? `Khối lượng ${fallbackIndex}`
      : `Màu ${String(fallbackIndex).padStart(2, '0')}`;
  }

  if (variantType === 'weight') {
    const weightToken = normalizedName.match(/\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|l|lit|oz|lb)\b/i);
    if (weightToken?.[0]) {
      return weightToken[0].replace(/\s+/g, '').toUpperCase();
    }
  } else {
    const colorCodeToken = normalizedName.match(/\b[A-Za-z]{1,4}\d{1,4}\b/);
    if (colorCodeToken?.[0]) {
      return colorCodeToken[0].toUpperCase();
    }
  }

  return normalizedName;
}

function detectVariantType(variants = []) {
  if (!Array.isArray(variants) || variants.length === 0) return 'color';

  const names = variants.map((variant) => String(variant?.TenBienThe || '').trim()).filter(Boolean);
  if (names.length === 0) return 'color';

  const weightPattern = /\b\d+(?:[.,]\d+)?\s*(?:ml|g|gr|gram|kg|l|lit|oz|lb)\b/i;
  const colorKeywordPattern = /\b(mau|màu|shade|color|đen|trang|trắng|do|đỏ|hong|hồng|cam|nau|nâu|xanh|tim|tím|be|nude|brown|red|pink|orange|coral|peach|rose)\b/i;
  const colorCodePattern = /\b[A-Za-z]{1,4}\d{1,4}\b/;

  let weightHits = 0;
  let colorHits = 0;

  names.forEach((name) => {
    if (weightPattern.test(name)) {
      weightHits += 1;
      return;
    }

    if (colorKeywordPattern.test(name) || colorCodePattern.test(name)) {
      colorHits += 1;
    }
  });

  if (weightHits > 0 && weightHits >= colorHits) return 'weight';
  return 'color';
}

export default ProductDetailView;
