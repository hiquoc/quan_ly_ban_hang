import { useContext, useState, useEffect } from "react";
import { FiCreditCard, FiTruck, FiFileText, FiEdit, FiTrash2, FiStar, FiMapPin, FiUser, FiPhone, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import { getCustomerDetails, updateAddress, createAddress, changMainAddress, deleteAddress, updateCustomer } from "../apis/customerApi";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import ConfirmPanel from "../components/ConfirmPanel";
import VerificationSection from "../components/VerificationSection";
import { PopupContext } from "../contexts/PopupContext";
import { getActivePromotions, validatePromotionCode } from "../apis/promotionApi";
import { createOrder } from "../apis/orderApi";
import { Helmet } from "react-helmet-async";

export default function CheckoutPage() {
    const { role, ownerId } = useContext(AuthContext);
    const navigate = useNavigate();
    if (role !== "CUSTOMER") return <Navigate to="/" replace />;
    const { showPopup } = useContext(PopupContext)
    const { cart, updateCart, removeFromCart, reloadCart, clearSelectedItems } = useContext(CartContext);
    const [step, setStep] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [promoCode, setPromoCode] = useState("");
    const [discountedAmount, setDiscountedAmount] = useState(0);
    const [showPromoPanel, setShowPromoPanel] = useState(false);
    const [promotions, setPromotions] = useState([]);
    const [loadingPromos, setLoadingPromos] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const stepTitles = ["Thông tin đơn hàng", "Thông tin giao hàng", "Thanh toán"];
    const stepIcons = [<FiFileText />, <FiTruck />, <FiCreditCard />];

    const [customer, setCustomer] = useState(null);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editAddressForm, setEditAddressForm] = useState({
        id: null, name: "", phone: "", street: "", ward: "", district: "", city: "", isMain: false
    });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [verifyAccountPanel, setVerifyAccountPanel] = useState(false)
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedName, setSelectedName] = useState(null);
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("")
    const [isCreatingOrder, setIsCreatingOrder] = useState(false)
    // Only persist selected item variantIds
    const [selectedItems, setSelectedItems] = useState(() => {
        const saved = localStorage.getItem("selectedItems");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("selectedItems", JSON.stringify(selectedItems));
    }, [selectedItems]);
    useEffect(() => {
        if (showPromoPanel) {
            fetchPromotions();
        }
    }, [showPromoPanel]);

    useEffect(() => {
        if (!selectedItems || selectedItems.length === 0) {
            showPopup("Giỏ hàng trống! Vui lòng chọn sản phẩm trước khi thanh toán!", "error", () => navigate(-1));
        }
    }, [selectedItems, navigate]);

    useEffect(() => {
        if (customer && selectedAddressId) {
            const addr = customer.addresses.find(ad => ad.id === selectedAddressId);
            if (addr) {
                const fullAddress = [addr.street, addr.ward, addr.district, addr.city]
                    .filter(Boolean)
                    .join(", ");
                setSelectedAddress(fullAddress);
                setSelectedName(addr.name);
                setSelectedPhone(addr.phone);
            }

        }
    }, [customer, selectedAddressId]);

    const handleRemoveSelectedItem = (variantId) => {
        setSelectedItems(prev => prev.filter(id => id !== variantId));
    };

    const selectedCartItems = cart.items.filter(item =>
        selectedItems.includes(item.variantId)
    );

    const selectedSubtotal = selectedCartItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
    );
    const handleValidatePromotionCode = async (code) => {
        const categoryIds = [...new Set(selectedCartItems.map(item => item.categoryId))];
        const brandIds = [...new Set(selectedCartItems.map(item => item.brandId))];
        const res = await validatePromotionCode(
            code,
            selectedSubtotal,
            selectedCartItems.map(item => item.productId),
            categoryIds,
            brandIds
        );
        if (res.error) {
            showPopup(res.error);
            return false;
        }
        else if (!res.data.isValid) {
            showPopup(res.data.message);
            return false;
        }
        setDiscountedAmount(res.data.discountAmount);
        return true;
    };
    const fetchPromotions = async () => {
        setLoadingPromos(true);
        try {
            const res = await getActivePromotions();
            if (res.error)
                return showPopup(res.error)
            setPromotions(res.data);
            console.log(res.data)
        } finally {
            setLoadingPromos(false);
        }
    };

    const handleSelectPromo = (promo) => {
        setSelectedPromo(promo);
    };
    const handleApplyPromo = async () => {
        if (selectedPromo) {
            const isValid = await handleValidatePromotionCode(selectedPromo.code);
            if (isValid) {
                setPromoCode(selectedPromo.code);
                setShowPromoPanel(false);
                return;
            }
            setPromoCode(null);
            setDiscountedAmount(0)
            setSelectedPromo(null);
        }
    };
    // console.log(selectedCartItems)

    // =========================
    const loadCustomer = async () => {
        const res = await getCustomerDetails(ownerId);
        if (res.error) return;
        setCustomer(res.data);
        setSelectedAddressId(res.data.addresses?.find(a => a.isMain)?.id || null)
    };
    const handleUpdateEmail = async (email) => {
        const res = await updateCustomer(null, null, email);
        if (res.error) return showPopup(res.error);
    }

    const openAddressForm = (addr = null) => {
        if (addr) setEditAddressForm({ ...addr });
        else setEditAddressForm({ id: null, name: "", phone: "", street: "", ward: "", district: "", city: "", isMain: false });
        setShowAddressForm(true);
    };

    const handleSaveAddress = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const { id, name, phone, street, ward, district, city } = editAddressForm;
            if (!name?.trim()) return showPopup("Vui lòng nhập tên người nhận");
            if (!phone?.trim()) return showPopup("Vui lòng nhập số điện thoại");
            if (!/^\d{9,12}$/.test(phone)) return showPopup("Số điện thoại không hợp lệ");
            if (!street?.trim()) return showPopup("Vui lòng nhập số nhà / tên đường");
            if (!ward?.trim()) return showPopup("Vui lòng nhập phường / xã");
            if (!district?.trim()) return showPopup("Vui lòng nhập quận / huyện");
            if (!city?.trim()) return showPopup("Vui lòng nhập tỉnh / thành phố");

            if (id) {
                const res = await updateAddress(id, name, phone, street, ward, district, city);
                if (res.error) return showPopup(res.error);
                setCustomer(prev => ({
                    ...prev,
                    addresses: prev.addresses.map(a => (a.id === id ? { ...a, name, phone, street, ward, district, city } : a))
                }));
            } else {
                const res = await createAddress(name, phone, street, ward, district, city);
                if (res.error) return showPopup(res.error);
                const newAddr = { ...editAddressForm, id: res.data, isMain: false };
                setCustomer(prev => ({ ...prev, addresses: [...prev.addresses, newAddr] }));
            }
            setShowAddressForm(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSetMainAddress = async (id) => {
        const res = await changMainAddress(id);
        if (res.error) return showPopup("Cập nhật địa chỉ mặc định thất bại");
        setCustomer(prev => ({
            ...prev,
            addresses: prev.addresses.map(a => ({ ...a, isMain: a.id === id }))
        }));
    };

    const handleDeleteAddress = async (id) => {
        const res = await deleteAddress(id);
        if (res.error) return showPopup("Xóa địa chỉ thất bại");
        setCustomer(prev => ({ ...prev, addresses: prev.addresses.filter(a => a.id !== id) }));
    };
    // =========================
    const handleCheckout = async () => {
        if (isCreatingOrder) return;
        setIsCreatingOrder(true);
        try {
            if (paymentMethod === "")
                return showPopup("Vui lòng chọn phương thức thanh toán!");

            const orderItemRequest = selectedCartItems.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity
            }));

            const res = await createOrder({
                items: orderItemRequest,
                shippingName: selectedName,
                shippingAddress: selectedAddress,
                shippingPhone: selectedPhone,
                paymentMethod: paymentMethod,
                promotionCode: promoCode,
                clearCart: false
            });

            if (res.error) {
                if (res.status === 403) {
                    setVerifyAccountPanel(true);
                    return;
                }

                if (res.status === 503) {
                    return showPopup(res.error || "Không thể kiểm tra trạng thái xác thực của tài khoản!");
                }
                if (res.status === 500) {
                    return showPopup(res.error, "error", () => window.location.reload());
                }
                return showPopup(res.error);
            }

            const { requiresPayment, payment } = res.data;
            clearSelectedItems();
            if (requiresPayment && payment?.paymentUrl) {
                window.location.href = payment.paymentUrl;
            } else {
                showPopup("Đặt hàng thành công!", "success", () =>
                    navigate("/customer", { replace: true })
                );


                setTimeout(() => {
                    navigate("/customer", { replace: true });
                }, 500);
            }
        } finally {
            setIsCreatingOrder(false);
        }
    };


    return (
        <>
            <Helmet>
                <title>Thanh toán</title>
            </Helmet>
            <div className="px-20 pt-10 flex flex-col">
                <div className="flex justify-center items-center gap-60 mb-10">
                    {stepTitles.map((title, index) => (
                        <div key={index} className="flex flex-col items-center relative">
                            <div className={`w-12 h-12 flex items-center justify-center rounded-full text-xl ${step === index ? "bg-black text-white" : step > index ? "bg-green-500 text-white" : "border border-gray-400 text-gray-400"}`}>
                                {stepIcons[index]}
                            </div>
                            <span className={`mt-2 text-center text-sm font-medium ${step === index ? "text-black" : step > index ? "text-green-600" : "text-gray-400"}`}>
                                {title}
                            </span>
                        </div>
                    ))}
                </div>

                {step === 0 && (
                    <div className="flex flex-wrap gap-15">
                        <div className="flex-5">
                            <h2 className="text-3xl font-bold mb-5">Giỏ hàng</h2>
                            <div className="max-h-[600px] overflow-y-auto space-y-4">
                                {selectedCartItems.length === 0 ? (
                                    <div className="flex items-center gap-2">
                                        <svg
                                            className="animate-spin h-5 w-5 text-gray-700"
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
                                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                            ></path>
                                        </svg>
                                        <p className="text-gray-500">Đang tải</p>
                                    </div>
                                ) : (
                                    selectedCartItems.map((item) => (
                                        <div key={item.id} className="flex p-3 border-b border-gray-300">
                                            <img onClick={() => navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)}
                                                src={item.imageUrls?.main} alt={item.variantName}
                                                className="w-20 h-20 object-cover rounded mr-6 hover:cursor-pointer" />
                                            <div className="min-h-[2.5rem] w-90 flex items-center">
                                                <p className="text-lg font-medium line-clamp-2 leading-tight">{item.variantName}</p>
                                            </div>
                                            <div className="flex-1 flex justify-between items-center ml-8">
                                                <div className="flex items-center space-x-3">
                                                    <button onClick={() => updateCart(item.id, item.quantity - 1)} className="p-1 hover:cursor-pointer">-</button>
                                                    <span className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded">{item.quantity}</span>
                                                    <button onClick={() => updateCart(item.id, item.quantity + 1)} className="p-1 hover:cursor-pointer">+</button>
                                                </div>
                                                <p className="text-lg font-semibold text-gray-700">{item.totalPrice.toLocaleString("vi-VN")}₫</p>
                                                <button
                                                    onClick={() => handleRemoveSelectedItem(item.variantId)}
                                                    className="text-gray-700 text-2xl hover:text-gray-700 hover:cursor-pointer"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="py-10 px-15 flex-3 self-start border border-gray-200 rounded-lg shadow">
                            <h2 className="text-2xl font-bold mb-6">Thông tin đơn hàng</h2>
                            <div className="mb-10">

                                <div className="mb-10">
                                    <span className="text-gray-600">Mã giảm giá</span>
                                    <div className="relative mt-2">
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-lg pr-28 p-4 focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="Nhập mã giảm giá"
                                            value={promoCode || ""}
                                            readOnly
                                        />
                                        <button
                                            onClick={() => setShowPromoPanel(true)}
                                            className="absolute right-1 top-1 bottom-1 border border-black px-4 h-8 m-auto mr-4 rounded hover:bg-gray-200 transition hover:cursor-pointer"
                                        >
                                            Chọn mã
                                        </button>
                                    </div>

                                    {/* Promotion Popup Modal */}
                                    {showPromoPanel && (
                                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
                                                {/* Header */}
                                                <div className="flex justify-between items-center px-8 py-5 border-b border-gray-200">
                                                    <div>
                                                        <h3 className="font-bold text-2xl text-gray-900">Chọn mã giảm giá</h3>
                                                        <p className="text-sm text-gray-500 mt-1">Chọn một mã để áp dụng cho đơn hàng</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowPromoPanel(false)}
                                                        className="-mr-5 -mt-8 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Scrollable Content */}
                                                <div className="flex-1 overflow-y-auto px-8 py-4">
                                                    {loadingPromos ? (
                                                        <div className="flex flex-col items-center justify-center py-16">
                                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                                                            <p className="text-gray-500">Đang tải mã giảm giá...</p>
                                                        </div>
                                                    ) : promotions.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center py-16">
                                                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <p className="text-gray-500 text-lg">Không có mã giảm giá khả dụng</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {promotions.map((promo) => (
                                                                <div
                                                                    key={promo.id}
                                                                    className={`relative border-1 rounded-xl p-5 cursor-pointer transition-all duration-200 ${selectedPromo?.id === promo.id
                                                                        ? 'border-black bg-gradient-to-r from-gray-50 to-white shadow-md'
                                                                        : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                                                                        }`}
                                                                    onClick={() => handleSelectPromo(promo)}
                                                                >

                                                                    <div className="flex gap-4">
                                                                        {/* Radio Button */}
                                                                        <div className="flex-shrink-0 pt-1">
                                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPromo?.id === promo.id
                                                                                ? 'border-black bg-black'
                                                                                : 'border-gray-300'
                                                                                }`}>
                                                                                {selectedPromo?.id === promo.id && (
                                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Promo Content */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                                                <div className="flex-1">
                                                                                    <div className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm px-3 py-1 rounded-md mb-2">
                                                                                        {promo.code}
                                                                                    </div>
                                                                                    <div className="font-semibold text-gray-900 text-base">{promo.name}</div>
                                                                                </div>
                                                                                <div className="text-right flex-shrink-0">
                                                                                    <div className="font-bold text-xl text-green-600">
                                                                                        {promo.promotionType === 'PERCENTAGE'
                                                                                            ? `${promo.discountValue}%`
                                                                                            : `${promo.discountValue.toLocaleString('vi-VN')}₫`
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-xs text-gray-500">Giảm giá</div>
                                                                                </div>
                                                                            </div>

                                                                            {promo.description && (
                                                                                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{promo.description}</p>
                                                                            )}

                                                                            <div className="flex flex-wrap gap-3 text-xs">
                                                                                {promo.minOrderAmount != null && (
                                                                                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                        </svg>
                                                                                        <span>Đơn tối thiểu: <strong>{promo.minOrderAmount.toLocaleString('vi-VN')}₫</strong></span>
                                                                                    </div>
                                                                                )}
                                                                                {promo.maxDiscountAmount && (
                                                                                    <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                        </svg>
                                                                                        <span>Tối đa: <strong>{promo.maxDiscountAmount.toLocaleString('vi-VN')}₫</strong></span>
                                                                                    </div>
                                                                                )}
                                                                                {promo.endDate && (
                                                                                    <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                        </svg>
                                                                                        <span>HSD: <strong>{new Date(promo.endDate).toLocaleDateString('vi-VN')}</strong></span>
                                                                                    </div>
                                                                                )}
                                                                                {promo.usageLimit && promo.usageCount !== undefined && (
                                                                                    <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                        </svg>
                                                                                        <span>Còn lại: <strong>{promo.usageLimit - promo.usageCount}</strong> lượt</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="flex gap-3 px-6 py-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                                                    <button
                                                        onClick={() => setShowPromoPanel(false)}
                                                        className="flex-1 px-6 py-3 border-1 border-gray-500 text-gray-700 font-semibold rounded-lg hover:bg-white hover:border-gray-400 transition-all"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        onClick={handleApplyPromo}
                                                        disabled={!selectedPromo}
                                                        className="flex-1 px-6 py-3 bg-black text-white cursor-pointer font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg disabled:shadow-none"
                                                    >
                                                        {selectedPromo ? 'Áp dụng mã' : 'Chọn mã giảm giá'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-lg font-medium">Tiền sản phẩm</span>
                                    <span className="text-lg font-medium">{selectedSubtotal.toLocaleString("vi-VN")}₫</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className=" text-gray-500 font-medium">Chi phí giao hàng & phát sinh</span>
                                    {deliveryFee === 0 ? (<span className=" font-medium">Miễn phí </span>)
                                        : (<span className=" font-medium">
                                            {`${(deliveryFee).toLocaleString("vi-VN")}đ`}
                                        </span>)}
                                </div>
                                {discountedAmount > 0 && (
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Giảm giá</span>
                                        <span className="font-semibold text-red-500">{(discountedAmount.toLocaleString("vi-VN"))}₫</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl mt-8 border-t pt-4 font-semibold">
                                    <span>Tổng cộng</span>
                                    <span>{(selectedSubtotal + deliveryFee - discountedAmount).toLocaleString("vi-VN")}₫</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="mt-6 w-full border border-black px-10 py-4 rounded-lg hover:bg-gray-100 hover:cursor-pointer transition text-lg font-medium flex items-center justify-center gap-2 shadow"
                                    onClick={() => navigate(-1) || navigate("/")}
                                >
                                    <FiX className="text-xl" />
                                    Hủy
                                </button>
                                <button
                                    className="mt-6 w-full bg-black text-white px-10 py-4 rounded-lg hover:bg-gray-900 hover:cursor-pointer transition text-lg font-medium flex items-center justify-center gap-2 shadow"
                                    onClick={() => { setStep(1); loadCustomer() }}
                                >
                                    <FiCreditCard className="text-xl" />
                                    Thanh toán
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* Step 1 & Step 2 remain unchanged */}
                {step === 1 && (
                    <div className="py-15 px-20 border border-gray-200 rounded-lg shadow space-y-6">
                        <h2 className="text-3xl font-bold mb-6">Thông tin giao hàng</h2>
                        {customer?.addresses?.length ? customer.addresses
                            .slice()
                            .sort((a, b) => Number(b.isMain) - Number(a.isMain))
                            .map(addr => (
                                <div key={addr.id} className={`bg-gray-50 rounded-lg py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow ${selectedAddressId === addr.id ? "ring-2 ring-black" : ""}`}>
                                    <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                                        <input
                                            type="radio"
                                            checked={selectedAddressId === addr.id}
                                            onChange={() => setSelectedAddressId(addr.id)}
                                            className="accent-black w-4 h-4 mt-1"
                                        />

                                        <div className="ml-2">
                                            <p className="text-lg font-semibold text-black mb-2">{addr.name}</p>
                                            <p className=" text-gray-600 mb-0.5">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                                            <p className=" text-gray-600">{addr.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-5 mt-2 sm:mt-0 text-xl items-center">
                                        <span
                                            title={addr.isMain ? "Địa chỉ mặc định" : "Đặt làm địa chỉ mặc định"}
                                            onClick={() => handleSetMainAddress(addr.id)}
                                            className="hover:cursor-pointer transition-transform duration-150 hover:scale-125"
                                        >
                                            {addr.isMain ? (
                                                <FaStar className="text-yellow-400" />
                                            ) : (
                                                <FiStar className="text-gray-400" />
                                            )}
                                        </span>
                                        <FiEdit
                                            className="hover:cursor-pointer transition-transform duration-150 hover:scale-125"
                                            onClick={() => openAddressForm(addr)}
                                        />
                                        <FiTrash2
                                            className="hover:cursor-pointer transition-transform duration-150 hover:scale-125"
                                            onClick={() =>
                                                setConfirmPanel({
                                                    visible: true,
                                                    message: "Xóa địa chỉ?",
                                                    onConfirm: () => handleDeleteAddress(addr.id),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            ))
                            : <p className="text-gray-500 text-center italic">Chưa có địa chỉ nào</p>}

                        <div className="relative w-full flex justify-center items-center my-10">
                            <div className="flex-1 text-center relative">
                                <span className="text-gray-500 text-sm whitespace-nowrap" style={{ background: "linear-gradient(to right, transparent, #6b7280 20%, #6b7280 80%, transparent)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block", width: "80%" }}>
                                    {'-'.repeat(200)}
                                </span>
                                <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 flex flex-col items-center">
                                    <div onClick={() => openAddressForm()} className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:cursor-pointer">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <span onClick={() => openAddressForm()} className="mt-1 text-base text-center text-black hover:cursor-pointer">Thêm Địa Chỉ</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button className="px-10 py-4 rounded border border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition" onClick={() => setStep(0)}>Quay lại</button>
                            <button
                                className="bg-black text-white px-10 py-4 rounded hover:bg-gray-900 hover:cursor-pointer transition text-lg font-medium flex items-center justify-center gap-2 shadow"
                                onClick={() => selectedAddressId ? setStep(2) : showPopup("Vui lòng chọn địa chỉ")}
                            >
                                Tiếp theo
                            </button>
                        </div>

                        {showAddressForm && (
                            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
                                <div className="bg-white rounded-xl shadow-lg p-6 w-[500px]">
                                    <h3 className="font-bold text-black text-xl mb-4">{editAddressForm.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex gap-3">
                                            <div className="w-7/12 flex flex-col gap-1">
                                                <label htmlFor="name" className="text-gray-700 font-medium">Tên người nhận</label>
                                                <input
                                                    id="name"
                                                    type="text"
                                                    placeholder="Nhập tên người nhận"
                                                    value={editAddressForm.name}
                                                    onChange={e => setEditAddressForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                                                />
                                            </div>
                                            <div className="w-5/12 flex flex-col gap-1">
                                                <label htmlFor="phone" className="text-gray-700 font-medium">Số điện thoại</label>
                                                <input
                                                    id="phone"
                                                    type="text"
                                                    placeholder="Nhập số điện thoại"
                                                    value={editAddressForm.phone}
                                                    onChange={e => setEditAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                                                    className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="street" className="text-gray-700 font-medium">Số nhà & đường</label>
                                            <input
                                                id="street"
                                                type="text"
                                                placeholder="Nhập số nhà & đường"
                                                value={editAddressForm.street}
                                                onChange={e => setEditAddressForm(prev => ({ ...prev, street: e.target.value }))}
                                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="ward" className="text-gray-700 font-medium">Phường</label>
                                            <input
                                                id="ward"
                                                type="text"
                                                placeholder="Nhập phường"
                                                value={editAddressForm.ward}
                                                onChange={e => setEditAddressForm(prev => ({ ...prev, ward: e.target.value }))}
                                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="district" className="text-gray-700 font-medium">Quận/ Huyện</label>
                                            <select
                                                id="district"
                                                value={editAddressForm.district || ""}
                                                onChange={e => setEditAddressForm(prev => ({ ...prev, district: e.target.value }))}
                                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                            >
                                                <option value="">Chọn quận/ huyện</option>
                                                <option value="Quận 1">Quận 1</option>
                                                <option value="Quận 2">Quận 2</option>
                                                <option value="Quận 3">Quận 3</option>
                                                <option value="Quận 4">Quận 4</option>
                                                <option value="Quận 5">Quận 5</option>
                                                <option value="Quận 6">Quận 6</option>
                                                <option value="Quận 7">Quận 7</option>
                                                <option value="Quận 8">Quận 8</option>
                                                <option value="Quận 9">Quận 9</option>
                                                <option value="Quận 10">Quận 10</option>
                                                <option value="Quận 11">Quận 11</option>
                                                <option value="Quận 12">Quận 12</option>
                                                <option value="Quận Bình Tân">Quận Bình Tân</option>
                                                <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                                                <option value="Quận Gò Vấp">Quận Gò Vấp</option>
                                                <option value="Quận Phú Nhuận">Quận Phú Nhuận</option>
                                                <option value="Quận Tân Bình">Quận Tân Bình</option>
                                                <option value="Quận Tân Phú">Quận Tân Phú</option>
                                                <option value="Quận Thủ Đức">Quận Thủ Đức</option>
                                                <option value="Huyện Bình Chánh">Huyện Bình Chánh</option>
                                                <option value="Huyện Cần Giờ">Huyện Cần Giờ</option>
                                                <option value="Huyện Củ Chi">Huyện Củ Chi</option>
                                                <option value="Huyện Hóc Môn">Huyện Hóc Môn</option>
                                                <option value="Huyện Nhà Bè">Huyện Nhà Bè</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="city" className="text-gray-700 font-medium">
                                                Thành phố/ Tỉnh
                                            </label>
                                            <select
                                                id="city"
                                                value={editAddressForm.city || ""}
                                                onChange={e => setEditAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                                className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black bg-white"
                                            >
                                                <option value="">Chọn thành phố/ tỉnh</option>
                                                <option value="Thành phố Hồ Chí Minh">Thành phố Hồ Chí Minh</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <button onClick={() => setShowAddressForm(false)}
                                                className={`px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                                                disabled={isProcessing}>Hủy</button>
                                            <button onClick={handleSaveAddress} className={`flex gap-1 justify-center items-center px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                                                disabled={isProcessing}>
                                                {isProcessing && (<svg
                                                    className="animate-spin h-5 w-5 text-black"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25 text-gray-200"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75 text-white"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                    ></path>
                                                </svg>)}
                                                {isProcessing ? "Đang xử lý" : editAddressForm.id ? "Cập nhật" : "Thêm"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <ConfirmPanel
                            visible={confirmPanel.visible}
                            message={confirmPanel.message}
                            onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); setConfirmPanel({ visible: false, message: "", onConfirm: null }); }}
                            onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
                        />
                    </div>
                )}

                {step === 2 && selectedAddressId && (
                    <div className="flex gap-10">
                        {/* Left: Order Summary */}
                        <div className="flex-5 border border-gray-200 rounded-lg py-8 px-10 space-y-6">
                            <h2 className="text-2xl font-bold mb-4">Đơn hàng của bạn</h2>
                            <div className="space-y-3 max-h-[350px] overflow-y-auto">
                                {selectedCartItems.map(item => (
                                    <div key={item.id} className="p-3 flex items-center bg-gray-100 rounded-xl">
                                        <img
                                            src={item.imageUrls?.main}
                                            alt={item.variantName}
                                            className="w-20 h-20 object-cover rounded mr-6"
                                        />
                                        <div className="flex-1 flex justify-between items-center">
                                            <p className="font-semibold line-clamp-2 text-gray-800 mr-4">{item.variantName}</p>

                                            {/* Quantity and total price */}
                                            <div className="flex items-center gap-3">
                                                <span className=" text-red-500 w-8 h-8 rounded flex justify-center items-center">
                                                    x{item.quantity}
                                                </span>
                                                <span className="font-semibold">{item.totalPrice.toLocaleString("vi-VN")}₫</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                            </div>

                            <div className="mt-8">
                                <div className="text-lg flex justify-between font-semibold mb-1">
                                    <span className="text-gray-800">Tiền sản phẩm</span>
                                    <span>{selectedSubtotal.toLocaleString("vi-VN")}₫</span>
                                </div>
                                <div className="text-lg flex justify-between mb-2">
                                    <span className="text-gray-600">Phí giao hàng  & phát sinh</span>
                                    {deliveryFee === 0 ? (<span className="text-lg font-medium">Miễn phí </span>)
                                        : (<span className="text-lg font-medium">
                                            {`${(deliveryFee).toLocaleString("vi-VN")}đ`}
                                        </span>)}
                                </div>
                                {discountedAmount > 0 && (
                                    <div className="text-lg flex justify-between mb-2">
                                        <span className="text-gray-600">Giảm giá</span>
                                        <span className="font-semibold text-red-500">{(discountedAmount.toLocaleString("vi-VN"))}₫</span>
                                    </div>
                                )}
                                <div className="text-lg flex justify-between font-semibold text-lg">
                                    <span>Tổng cộng</span>
                                    <span className="font-bold">{(selectedSubtotal + deliveryFee - discountedAmount).toLocaleString("vi-VN")}₫</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Payment */}
                        <div className="flex-7 pl-10 py-5 space-y-6">
                            <h2 className="text-2xl font-bold">Địa chỉ nhận hàng</h2>
                            <div className="flex flex-col gap-2 mb-4">
                                <div className="flex items-center gap-4">
                                    <FiMapPin className="text-black text-xl" />
                                    <p className="text-gray-800">
                                        {selectedAddress}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <FiUser className="text-black text-xl" />
                                    <p className="text-gray-800">
                                        {customer.addresses.find(a => a.id === selectedAddressId)?.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <FiPhone className="text-black text-xl" />
                                    <p className="text-gray-800">
                                        {customer.addresses.find(a => a.id === selectedAddressId)?.phone}
                                    </p>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold pt-5">Phương thức thanh toán</h2>

                            {/* Payment Method Selection */}
                            <div className="flex gap-4 mb-4">
                                {/* COD */}
                                <button
                                    className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded border transition ${paymentMethod === "COD"
                                        ? "border-blue-600 bg-blue-100 shadow-sm text-blue-800"
                                        : "border-gray-300 hover:bg-blue-50 text-gray-800"
                                        }`}
                                    onClick={() => setPaymentMethod("COD")}
                                >
                                    <img src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1763219425/9198191_kdulyy.png" alt="COD" className="w-15 h-15" />
                                    <span className="font-medium">Thanh toán khi nhận hàng (COD)</span>
                                </button>

                                {/* VNPay */}
                                <button
                                    className={`flex-1 flex items-center justify-center gap-3 px-4 py-2 rounded border transition ${paymentMethod === "VNPAY"
                                        ? "border-blue-600 bg-blue-100 shadow-sm text-blue-800"
                                        : "border-gray-300 hover:bg-blue-50 text-gray-800"
                                        }`}
                                    onClick={() => setPaymentMethod("VNPAY")}
                                >
                                    <img src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1763219568/Icon-VNPAY-QR_ccoczd.webp" alt="VNPay" className="w-10 h-10" />
                                    <span className="font-medium">Thanh toán trực tuyến (VNPay)</span>
                                </button>
                            </div>


                            <div className="flex justify-end gap-5 mt-10">
                                <div className="flex gap-4">
                                    {/* Quay lại button */}
                                    <button
                                        className={`px-10 py-4 rounded border border-gray-300 transition cursor-pointer`}
                                        onClick={() => setStep(1)}
                                    >
                                        Quay lại
                                    </button>

                                    {/* Thanh toán button */}
                                    <button
                                        className={`bg-black text-white px-10 py-4 rounded text-lg font-medium flex items-center justify-center gap-2 shadow transition cursor-pointer`}
                                        onClick={handleCheckout}
                                    >
                                        <span>Thanh toán</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {step === 2 && selectedAddressId && verifyAccountPanel && (
                            <VerificationSection
                                email={customer.email}
                                setEmail={(value) => setCustomer((prev) => ({ ...prev, email: value }))}
                                showPopup={showPopup}
                                onVerified={() => handleUpdateEmail(customer.email)}
                                onClose={() => setVerifyAccountPanel(false)}
                                secure={true}
                                title={`Xác thực Email\n trước khi đặt hàng`}
                                completeTitle="Xác thực thành công! Đang xử lý..."
                            />
                        )}
                        {isCreatingOrder && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50 rounded pointer-events-auto">
                                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg flex items-center gap-2 shadow-lg border border-gray-200">
                                    <svg
                                        className="animate-spin h-5 w-5 text-gray-700"
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
                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        ></path>
                                    </svg>
                                    <span className="text-gray-700 font-medium">Đang xử lý...</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </>
    );
}
