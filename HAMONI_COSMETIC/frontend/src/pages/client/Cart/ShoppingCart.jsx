import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import './ShoppingCart.css';
import shoppingCartApi from '../../../services/shoppingCartApi';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ShoppingCart = () => {
  const navigate = useNavigate(); 
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState({});

  const getMaKhachHang = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.maND || user?.MaND || null;
  }, []);

  const fetchCartData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        setCartItems([]);
        return;
      }

      const response = await shoppingCartApi.getCartItems(maKhachHang);
      const data = response?.data || response;
      setCartItems(Array.isArray(data) ? data : []);
      if (Array.isArray(data)) {
        const nextQuantityInputs = {};
        data.forEach((item) => {
          nextQuantityInputs[item.MaBienThe] = String(item.SoLuong ?? 1);
        });
        setQuantityInputs(nextQuantityInputs);
      }
    } catch (error) {
      console.error("❌ Lỗi khi lấy giỏ hàng:", error);
      setCartItems([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [getMaKhachHang]);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  const formatVND = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const totalAmount = cartItems
    .filter(item => Number(item.IsSelected) === 1)
    .reduce((sum, item) => sum + (item.Gia * item.SoLuong), 0);

  const isAllSelected = cartItems.length > 0 && cartItems.every(item => Number(item.IsSelected) === 1);
  const selectedCount = cartItems.filter(item => Number(item.IsSelected) === 1).length;

  const commitQuantity = async (maBienThe, rawValue) => {
    const item = cartItems.find((cartItem) => cartItem.MaBienThe === maBienThe);
    const normalizedQty = Number.parseInt(String(rawValue), 10);

    if (!item) return;

    if (!Number.isFinite(normalizedQty)) {
      setQuantityInputs((prev) => ({ ...prev, [maBienThe]: String(item.SoLuong || 1) }));
      return;
    }

    await updateQuantity(maBienThe, normalizedQty);
  };

  const updateQuantity = async (maBienThe, newQty) => {
    const item = cartItems.find(i => i.MaBienThe === maBienThe);
    const maKhachHang = getMaKhachHang();
    const normalizedQty = Number(newQty);

    if (!maKhachHang) {
      toast.warning("Vui lòng đăng nhập để cập nhật giỏ hàng.");
      navigate('/login');
      return;
    }
    
    if (!Number.isFinite(normalizedQty)) {
      toast.error("Số lượng không hợp lệ.");
      return;
    }

    if (normalizedQty <= 0) {
      setItemToDelete(maBienThe);
      setShowModal(true);
      return;
    }

    const maxStock = Math.max(1, Number(item?.SoLuongTon || 0));
    const nextQty = Math.max(1, Math.min(maxStock, normalizedQty));

    setQuantityInputs((prev) => ({
      ...prev,
      [maBienThe]: String(nextQty)
    }));

    try {
      await shoppingCartApi.updateCartItem({
        maKhachHang,
        maBienThe,
        soLuong: nextQty,
        isSelected: item.IsSelected
      });
      fetchCartData(false);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        toast.warning(error.response.data.message);
        fetchCartData(false);
      } else {
        console.error("Lỗi cập nhật số lượng:", error);
      }
    }
  };

  const toggleSelect = async (maBienThe, currentStatus) => {
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để cập nhật giỏ hàng.");
        navigate('/login');
        return;
      }

      const item = cartItems.find(i => i.MaBienThe === maBienThe);
      await shoppingCartApi.updateCartItem({
        maKhachHang,
        maBienThe,
        soLuong: item.SoLuong,
        isSelected: Number(currentStatus) === 1 ? 0 : 1
      });
      fetchCartData();
    } catch (error) {
      console.error("Lỗi chọn sản phẩm:", error);
      toast.error("Lỗi chọn sản phẩm!");
    }
  };

  const toggleSelectAll = async () => {
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để cập nhật giỏ hàng.");
        navigate('/login');
        return;
      }

      const newStatus = isAllSelected ? 0 : 1;
      await Promise.all(cartItems.map(item => 
        shoppingCartApi.updateCartItem({
          maKhachHang,
          maBienThe: item.MaBienThe,
          soLuong: item.SoLuong,
          isSelected: newStatus
        })
      ));
      fetchCartData();
    } catch (error) {
      console.error("Lỗi chọn tất cả:", error);
      toast.error("Lỗi chọn tất cả!");
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để thao tác giỏ hàng.");
        navigate('/login');
        return;
      }

      if (itemToDelete === 'multiple') {
        const selectedItems = cartItems.filter(item => Number(item.IsSelected) === 1);
        await Promise.all(selectedItems.map(item => 
          shoppingCartApi.removeCartItem({ maKhachHang, maBienThe: item.MaBienThe })
        ));
        toast.success("Đã xóa các sản phẩm được chọn!");
      } else {
        await shoppingCartApi.removeCartItem({ 
          maKhachHang, 
          maBienThe: itemToDelete 
        });
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng!");
      }
      setShowModal(false);
      setItemToDelete(null);
      fetchCartData();
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      toast.error("Có lỗi khi xóa sản phẩm.");
    }
  };

  const handleBuyNow = async () => {
    if (selectedCount === 0) return;
    try {
      const maKhachHang = getMaKhachHang();
      if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để thanh toán.");
        navigate('/login');
        return;
      }

      const selectedVariantIds = cartItems
        .filter((item) => Number(item.IsSelected) === 1)
        .map((item) => Number(item.MaBienThe))
        .filter((id) => Number.isInteger(id) && id > 0);

      if (!selectedVariantIds.length) {
        toast.warning("Vui lòng chọn sản phẩm để thanh toán.");
        return;
      }

      await shoppingCartApi.holdStock({
        maKhachHang
      });
      sessionStorage.setItem('checkoutSelectedVariantIds', JSON.stringify(selectedVariantIds));
      navigate('/orderpayment', {
        state: { selectedVariantIds }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi giữ hàng, vui lòng thử lại.");
      fetchCartData(); 
    }
  };

  const handleMoveToWishlist = async () => {
    const maKhachHang = getMaKhachHang();
    if (!maKhachHang) {
        toast.warning("Vui lòng đăng nhập để thực hiện thao tác này.");
        navigate('/login');
        return;
    }

    const selectedItems = cartItems
        .filter(item => Number(item.IsSelected) === 1)
        .map(item => item.MaBienThe);

    if (selectedItems.length === 0) {
        toast.warning("Vui lòng chọn sản phẩm để lưu vào yêu thích!");
        return;
    }

    try {
        const response = await shoppingCartApi.moveToWishlist({
          maKhachHang,
            items: selectedItems
        });

        const isSuccess = response?.success || response?.data?.success;

        if (isSuccess) {
            toast.success(
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Đã lưu vào mục Yêu thích!</span>
                    <button 
                        onClick={() => navigate('/wishlist')} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: '#b22222', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: '0 0 0 15px'
                        }}
                    >
                        Xem ngay
                    </button>
                </div>, 
                { autoClose: 4000 } 
            );
            
            fetchCartData();
        } else {
            toast.error(response?.message || response?.data?.message || "Lỗi hệ thống, vui lòng thử lại.");
        }
    } catch (error) {
        console.error("Lỗi khi chuyển mục yêu thích:", error);
        toast.error("Có lỗi xảy ra khi lưu vào mục yêu thích.");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />

      {loading ? (
        <div className="cart-wrapper-pc">
            <div className="mt-5 text-center">Đang tải giỏ hàng...</div>
        </div>
      ) : (
        <div className="cart-wrapper-pc">
          <div className="cart-container-pc">
            
            <div className="cart-pc-header-nav">
               <div className="nav-left">
                  <span onClick={() => navigate(-1)} className="back-icon">←</span>
                  <span className="logo-text">Giỏ Hàng</span>
               </div>
               <div className="nav-right">
                  <span onClick={() => setIsEditMode(!isEditMode)} className="edit-btn">
                    {isEditMode ? 'Hoàn tất' : 'Sửa'}
                  </span>
               </div>
            </div>

            <div className="cart-pc-table-header">
               <div className="col-check">
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="hamoni-checkbox" />
               </div>
               <div className="col-product">Sản Phẩm</div>
               <div className="col-price">Đơn Giá</div>
               <div className="col-quantity">Số Lượng</div>
               <div className="col-total">Số Tiền</div>
               <div className="col-action">Thao Tác</div>
            </div>

            <div className="cart-pc-list">
              {cartItems.length === 0 ? (
                <div className="empty-cart-pc">Giỏ hàng của bạn đang trống</div>
              ) : (
                cartItems.map(item => (
                  <div key={item.MaBienThe} className="cart-pc-item">
                    <div className="col-check">
                       <input type="checkbox" checked={Number(item.IsSelected) === 1} onChange={() => toggleSelect(item.MaBienThe, item.IsSelected)} className="hamoni-checkbox" />
                    </div>
                    <div className="col-product">
                       <div className="product-info-box">
                          <div className="product-img-placeholder" style={{backgroundImage: `url(${item.DuongDanAnh})`, backgroundSize: 'cover'}}></div>
                          <div className="product-text">
                             <div className="product-name">{item.TenSP}</div>
                             <div className="product-variant">Phân loại: {item.TenBienThe}</div>
                          </div>
                       </div>
                    </div>
                    <div className="col-price">{formatVND(item.Gia)}</div>
                    <div className="col-quantity">
                        <div className="qty-control-pc">
                          <button onClick={() => updateQuantity(item.MaBienThe, Number(item.SoLuong) - 1)}>−</button>
                          <input 
                            type="number" 
                            value={quantityInputs[item.MaBienThe] ?? String(item.SoLuong)}
                            onChange={(e) => {
                              const numericText = String(e.target.value).replace(/\D/g, '');
                              if (!numericText) {
                                setQuantityInputs((prev) => ({
                                  ...prev,
                                  [item.MaBienThe]: ''
                                }));
                                return;
                              }

                              const maxStock = Math.max(1, Number(item.SoLuongTon || 0));
                              const parsedValue = Number.parseInt(numericText, 10);
                              const nextValue = Math.max(1, Math.min(maxStock, parsedValue));

                              setQuantityInputs((prev) => ({
                                ...prev,
                                [item.MaBienThe]: String(nextValue)
                              }));
                            }}
                            onBlur={(e) => commitQuantity(item.MaBienThe, e.target.value)}
                          />
                          <button onClick={() => updateQuantity(item.MaBienThe, Number(item.SoLuong) + 1)}>+</button>
                        </div>
                    </div>
                    <div className="col-total-red">{formatVND(item.Gia * item.SoLuong)}</div>
                    <div className="col-action">
                       <span className="delete-text" onClick={() => { setItemToDelete(item.MaBienThe); setShowModal(true); }}>Xóa</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-pc-footer">
               <div className="footer-top">
                  <div className="voucher-link" onClick={() => navigate('/vouchers')}>
                     🎟️ HAMONI Voucher | <span>Chọn hoặc nhập mã</span>
                  </div>
               </div>
               <div className="footer-bottom">
                  <div className="footer-left">
                     <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="hamoni-checkbox" />
                     <span>Chọn Tất Cả ({cartItems.length})</span>
                     {isEditMode && <span className="delete-all-btn" onClick={() => { setItemToDelete('multiple'); setShowModal(true); }}>Xóa các mục đã chọn</span>}
                  </div>
                  <div className="footer-right">
                     {!isEditMode ? (
                       <>
                         <div className="total-label">Tổng thanh toán ({selectedCount} sản phẩm):</div>
                         <div className="total-amount-large">{formatVND(totalAmount)}</div>
                         <button className="btn-buy" disabled={selectedCount === 0} onClick={handleBuyNow}>Thanh Toán</button>
                       </>
                     ) : (
                       <div className="edit-actions-pc">
                          <button className="btn-wishlist" onClick={handleMoveToWishlist}>Lưu vào mục đã thích</button>
                          <button className="btn-delete-multi" onClick={() => { setItemToDelete('multiple'); setShowModal(true); }}>Xóa</button>
                       </div>
                     )}
                  </div>
               </div>
            </div>

            {showModal && (
              <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="custom-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-content">Bạn chắc chắn muốn bỏ {itemToDelete === 'multiple' ? selectedCount : 1} sản phẩm này?</div>
                  <div className="modal-actions">
                    <button className="modal-btn modal-btn-cancel" onClick={() => setShowModal(false)}>Không</button>
                    <button className="modal-btn modal-btn-confirm" onClick={handleConfirmDelete}>Đồng ý</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ShoppingCart;