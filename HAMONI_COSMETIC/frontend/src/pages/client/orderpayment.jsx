import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CreditCard, Ticket, MessageSquare, ChevronLeft, X } from 'lucide-react';
import orderApi from '../../services/orderApi';
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../config/imageLinks';
import OrderNotification, { OnlinePaymentModal } from './ordernotification';
import './orderpayment.css'; // Import file CSS riêng

const OrderPayment = () => {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [checkoutData, setCheckoutData] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmingOnlinePayment, setConfirmingOnlinePayment] = useState(false);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [onlinePaymentInfo, setOnlinePaymentInfo] = useState(null);
  const [onlinePaymentSuccess, setOnlinePaymentSuccess] = useState(null);

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientPhone: '',
    recipientEmail: '',
    city: '',
    district: '',
    ward: '',
    streetAddress: '',
    note: ''
  });

  const formatCurrency = (amount) => `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)}đ`;

  const splitAddress = (fullAddress) => {
    const raw = String(fullAddress || '').trim();
    if (!raw) {
      return {
        city: '',
        district: '',
        ward: '',
        streetAddress: ''
      };
    }

    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 4) {
      return {
        city: parts[parts.length - 1],
        district: parts[parts.length - 2],
        ward: parts[parts.length - 3],
        streetAddress: parts.slice(0, parts.length - 3).join(', ')
      };
    }

    if (parts.length === 3) {
      return {
        city: parts[2],
        district: parts[1],
        ward: '',
        streetAddress: parts[0]
      };
    }

    if (parts.length === 2) {
      return {
        city: parts[1],
        district: '',
        ward: '',
        streetAddress: parts[0]
      };
    }

    return {
      city: raw,
      district: '',
      ward: '',
      streetAddress: ''
    };
  };

  const buildTransactionCode = () => {
    const ts = Date.now().toString();
    return `VNP${ts.slice(-10)}`;
  };

  const loadCheckoutPreview = async (nextVoucherCode = '') => {
    setLoadingCheckout(true);
    setError('');
    setNotice('');

    try {
      const payload = {};
      if (nextVoucherCode?.trim()) {
        payload.voucherCode = nextVoucherCode.trim();
      }

      const response = await orderApi.getCheckoutPreview(payload);
      const data = response.data ?? response;

      setCheckoutData(data);
      setVoucherCode(data?.maVoucher || nextVoucherCode.trim());
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || 'Không thể tải dữ liệu thanh toán');
      setCheckoutData(null);
    } finally {
      setLoadingCheckout(false);
    }
  };

  const loadCheckoutProfile = useCallback(async () => {
    try {
      const response = await orderApi.getCheckoutProfile();
      const profile = response?.data ?? response;
      const addressParts = splitAddress(profile?.address);

      setFormData((prev) => ({
        ...prev,
        recipientName: profile?.recipientName || prev.recipientName,
        recipientEmail: profile?.recipientEmail || prev.recipientEmail,
        recipientPhone: String(profile?.recipientPhone || prev.recipientPhone || '').replace(/\D/g, '').slice(0, 10),
        city: addressParts.city || prev.city,
        district: addressParts.district || prev.district,
        ward: addressParts.ward || prev.ward,
        streetAddress: addressParts.streetAddress || prev.streetAddress
      }));
    } catch {
      // Keep fallback from localStorage if profile API is not available.
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token) {
      setError('Vui lòng đăng nhập để tiếp tục thanh toán.');
      return;
    }

    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        setFormData((prev) => ({
          ...prev,
          recipientName: user?.hoTen || '',
          recipientEmail: user?.email || ''
        }));
      } catch {
        // Ignore malformed local user info.
      }
    }

    loadCheckoutProfile();
    loadCheckoutPreview('');
  }, [loadCheckoutProfile]);

  const canPlaceOrder = useMemo(() => {
    const isValidPhone = /^\d{10}$/.test(formData.recipientPhone.trim());

    return Boolean(
      checkoutData?.items?.length &&
      formData.recipientName.trim() &&
      isValidPhone &&
      formData.city.trim() &&
      formData.district.trim() &&
      formData.ward.trim() &&
      formData.streetAddress.trim() &&
      !loadingCheckout &&
      !placingOrder
    );
  }, [checkoutData?.items?.length, formData, loadingCheckout, placingOrder]);

  const getValidationMessage = () => {
    if (loadingCheckout) return 'Đang tải giỏ hàng, vui lòng đợi trong giây lát.';
    if (!checkoutData?.items?.length) return 'Giỏ hàng trống, chưa thể đặt hàng.';
    if (!formData.recipientName.trim()) return 'Vui lòng nhập họ và tên người nhận.';
    if (!formData.recipientPhone.trim()) return 'Vui lòng nhập số điện thoại người nhận.';
    if (!/^\d{10}$/.test(formData.recipientPhone.trim())) return 'Số điện thoại phải gồm đúng 10 chữ số.';
    if (!formData.city.trim()) return 'Vui lòng chọn hoặc nhập Tỉnh / Thành phố.';
    if (!formData.district.trim()) return 'Vui lòng chọn hoặc nhập Quận / Huyện.';
    if (!formData.ward.trim()) return 'Vui lòng chọn hoặc nhập Phường / Xã.';
    if (!formData.streetAddress.trim()) return 'Vui lòng nhập Số nhà, tên đường.';
    return '';
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyVoucher = async () => {
    await loadCheckoutPreview(voucherCode);
  };

  const handleClearVoucher = async () => {
    setVoucherCode('');
    await loadCheckoutPreview('');
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) {
      setError(getValidationMessage() || 'Vui lòng nhập đủ thông tin nhận hàng trước khi xác nhận thanh toán.');
      return;
    }

    setPlacingOrder(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        ...formData,
        shippingAddress: `${formData.streetAddress.trim()}, ${formData.ward.trim()}, ${formData.district.trim()}, ${formData.city.trim()}`,
        paymentMethod,
        voucherCode: checkoutData?.maVoucher || null
      };

      const response = await orderApi.placeOrder(payload);
      const responseData = response?.data?.data || response?.data || response;
      const orderId = responseData?.orderId;
      const totalAmount = responseData?.tongTien ?? checkoutData?.thanhTien ?? 0;

      if (!orderId) {
        throw new Error('Không lấy được mã đơn hàng sau khi thanh toán');
      }

      if (paymentMethod === 'cod') {
        setOnlinePaymentSuccess({
          orderId,
          totalAmount,
          transactionCode: 'COD',
          paidAt: new Date(),
          paymentMethodLabel: 'Thanh toán khi nhận hàng (COD)',
          isCod: true
        });
        setVoucherCode('');
        setCheckoutData({
          items: [],
          tongTien: 0,
          phiShip: 0,
          tienGiamGia: 0,
          thanhTien: 0,
          maVoucher: null
        });
        return;
      }

      setOnlinePaymentInfo({
        orderId,
        totalAmount,
        transactionCode: buildTransactionCode()
      });
      setShowOnlinePaymentModal(true);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || err.message || 'Đặt hàng thất bại, vui lòng thử lại.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleConfirmOnlinePayment = async () => {
    if (!onlinePaymentInfo) return;

    setConfirmingOnlinePayment(true);
    setError('');
    setNotice('Đang kiểm tra trạng thái thanh toán...');

    try {
      await orderApi.confirmOnlinePayment({
        orderId: onlinePaymentInfo.orderId,
        transactionCode: onlinePaymentInfo.transactionCode
      });

      const statusResponse = await orderApi.getOnlinePaymentStatus(onlinePaymentInfo.orderId);
      const statusData = statusResponse?.data?.data || statusResponse?.data || statusResponse;
      if (statusData?.paymentStatus !== 'DaThanhToan') {
        throw new Error('Thanh toán chưa được xác nhận thành công. Vui lòng thử lại sau ít phút.');
      }

      const paidAt = statusData?.paidAt ? new Date(statusData.paidAt) : new Date();

      setOnlinePaymentSuccess({
        ...onlinePaymentInfo,
        paidAt,
        paymentMethodLabel: 'Ví điện tử VNPAY'
      });
      setShowOnlinePaymentModal(false);
      setOnlinePaymentInfo(null);
      setNotice('');
      setVoucherCode('');
      setCheckoutData({
        items: [],
        tongTien: 0,
        phiShip: 0,
        tienGiamGia: 0,
        thanhTien: 0,
        maVoucher: null
      });
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || 'Không thể xác nhận thanh toán online. Vui lòng thử lại.');
    } finally {
      setConfirmingOnlinePayment(false);
    }
  };

  const handleCloseOnlinePayment = () => {
    if (confirmingOnlinePayment) return;

    setShowOnlinePaymentModal(false);
    setOnlinePaymentInfo(null);
    setNotice('Bạn đã hủy quét mã. Đơn vẫn ở trạng thái chờ thanh toán, giỏ hàng chưa bị trừ.');
  };

  const items = checkoutData?.items || [];

  if (onlinePaymentSuccess) {
    return (
      <OrderNotification
        isCod={onlinePaymentSuccess.isCod}
        transactionCode={onlinePaymentSuccess.transactionCode}
        orderId={onlinePaymentSuccess.orderId}
        paidAt={onlinePaymentSuccess.paidAt}
        paymentMethodLabel={onlinePaymentSuccess.paymentMethodLabel}
        totalAmount={onlinePaymentSuccess.totalAmount}
        onViewOrder={() => navigate('/')}
        onContinueShopping={() => navigate('/')}
      />
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-wrapper">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ChevronLeft size={16} /> Quay lại giỏ hàng
        </button>

        <header className="checkout-header">
          <h1>HAMONI COSMETIC</h1>
          <p>Hoàn tất thanh toán để nhận sản phẩm sớm nhất</p>
        </header>

        <div className="checkout-grid">
          {/* CỘT TRÁI: FORM THÔNG TIN */}
          <div className="form-column">
            <section className="checkout-section">
              <h2 className="section-title">
                <span className="step-number">1</span> Thông tin nhận hàng
              </h2>
              <div className="input-group-grid">
                <div className="input-field">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={formData.recipientName}
                    onChange={(e) => handleInputChange('recipientName', e.target.value)}
                  />
                </div>
                <div className="input-field">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="0901 234 567"
                    value={formData.recipientPhone}
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(e) => handleInputChange('recipientPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <div className="input-field full-width">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={formData.recipientEmail}
                    onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                  />
                </div>
                <div className="input-field full-width">
                  <label>Tỉnh / Thành phố</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Hà Nội"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="input-field full-width">
                  <label>Quận / Huyện</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Quận Hoàn Kiếm"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                  />
                </div>
                <div className="input-field full-width">
                  <label>Phường / Xã</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Phường Hàng Trống"
                    value={formData.ward}
                    onChange={(e) => handleInputChange('ward', e.target.value)}
                  />
                </div>
                <div className="input-field full-width">
                  <label>Số nhà, tên đường hoặc Thôn</label>
                  <textarea
                    rows="3"
                    placeholder="Ví dụ: 12 Tràng Tiền"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                  ></textarea>
                </div>
                <div className="note-field full-width">
                  <MessageSquare size={18} />
                  <input
                    type="text"
                    placeholder="Ghi chú thêm cho shipper..."
                    value={formData.note}
                    onChange={(e) => handleInputChange('note', e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="checkout-section">
              <h2 className="section-title">
                <span className="step-number">2</span> Phương thức thanh toán
              </h2>
              <div className="payment-options">
                <label className={`payment-card ${paymentMethod === 'cod' ? 'active' : ''}`} onClick={() => setPaymentMethod('cod')}>
                  <div className="payment-info">
                    <div className="custom-radio">
                      {paymentMethod === 'cod' && <div className="radio-dot" />}
                    </div>
                    <div>
                      <p className="payment-name">Thanh toán khi nhận hàng (COD)</p>
                      <p className="payment-desc">Thanh toán bằng tiền mặt khi nhận hàng</p>
                    </div>
                  </div>
                  <Truck size={24} className="payment-icon" />
                </label>

                <label className={`payment-card ${paymentMethod === 'vnpay' ? 'active' : ''}`} onClick={() => setPaymentMethod('vnpay')}>
                  <div className="payment-info">
                    <div className="custom-radio">
                      {paymentMethod === 'vnpay' && <div className="radio-dot" />}
                    </div>
                    <div>
                      <p className="payment-name">Thanh toán Online (VNPAY)</p>
                      <p className="payment-desc">Thanh toán an toàn qua cổng VNPAY</p>
                    </div>
                  </div>
                  <CreditCard size={24} className="payment-icon" />
                </label>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <div className="summary-column">
            <div className="summary-card">
              <h2 className="summary-title">Tóm tắt đơn hàng</h2>

              {loadingCheckout && <div className="checkout-message">Đang tải giỏ hàng...</div>}
              {!loadingCheckout && error && <div className="checkout-message error">{error}</div>}
              {!loadingCheckout && notice && <div className="checkout-message success">{notice}</div>}
              
              <div className="product-list">
                {items.map((item) => (
                  <div className="product-item" key={item.maBienThe}>
                    <div className="product-img-wrapper">
                      <img src={item.hinhAnh || PRODUCT_PLACEHOLDER_IMAGE} alt={item.tenSP} />
                      <span className="product-qty">{item.soLuong}</span>
                    </div>
                    <div className="product-info">
                      <h3>{item.tenSP}</h3>
                      <p>{item.tenBienThe}</p>
                    </div>
                    <span className="product-price">{formatCurrency(item.thanhTien)}</span>
                  </div>
                ))}
                {!loadingCheckout && !items.length && (
                  <div className="checkout-message">Giỏ hàng trống, chưa thể đặt hàng.</div>
                )}
              </div>

              <div className="coupon-section">
                <p className="coupon-label"><Ticket size={14} /> Mã giảm giá</p>
                <div className="coupon-input-wrapper">
                  <div className="coupon-input-shell">
                    <input
                      type="text"
                      placeholder="Nhập mã ưu đãi..."
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    />
                    {voucherCode.trim() && (
                      <button
                        type="button"
                        className="coupon-clear-button"
                        onClick={handleClearVoucher}
                        aria-label="Xóa mã giảm giá"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button onClick={handleApplyVoucher} disabled={loadingCheckout || placingOrder}>ÁP DỤNG</button>
                </div>
              </div>

              <div className="price-details">
                <div className="price-row">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(checkoutData?.tongTien)}</span>
                </div>
                <div className="price-row">
                  <span>Phí vận chuyển</span>
                  <span className="free-shipping text-green">{checkoutData?.phiShip ? formatCurrency(checkoutData.phiShip) : 'Miễn phí'}</span>
                </div>
                <div className="price-row">
                  <span>Giảm giá</span>
                  <span>-{formatCurrency(checkoutData?.tienGiamGia)}</span>
                </div>
                <div className="price-row total-row">
                  <span className="total-label">Tổng cộng</span>
                  <div className="total-value">
                    <span className="price-amount">{formatCurrency(checkoutData?.thanhTien)}</span>
                    <p className="vat-note">(Đã bao gồm VAT)</p>
                  </div>
                </div>
              </div>

              <button
                className="order-btn"
                onClick={handlePlaceOrder}
                disabled={loadingCheckout || placingOrder}
              >
                {placingOrder ? 'ĐANG XÁC NHẬN...' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showOnlinePaymentModal && onlinePaymentInfo && (
        <OnlinePaymentModal
          orderId={onlinePaymentInfo.orderId}
          totalAmount={onlinePaymentInfo.totalAmount}
          confirming={confirmingOnlinePayment}
          onCancel={handleCloseOnlinePayment}
          onConfirm={handleConfirmOnlinePayment}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

export default OrderPayment;