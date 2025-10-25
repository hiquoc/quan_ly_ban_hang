import { useContext, useState, useEffect } from "react";
import { FiCreditCard, FiTruck, FiFileText, FiEdit, FiTrash2, FiStar, FiMapPin, FiUser, FiPhone, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import { getCustomerDetails, updateAddress, createAddress, changMainAddress, deleteAddress } from "../apis/customerApi";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import ConfirmPanel from "../components/ConfirmPanel";
import { PopupContext } from "../contexts/PopupContext";
import { validatePromotionCode } from "../apis/promotionApi";
import codImg from "../assets/cod.png"
import vnpayImg from "../assets/vnpay.png"
import { createOrder } from "../apis/orderApi";

export default function CheckoutPage() {
    const { role, ownerId } = useContext(AuthContext);
    const navigate = useNavigate();
    if (role !== "CUSTOMER") return <Navigate to="/" replace />;
    const { showPopup } = useContext(PopupContext)
    const { cart, updateCart, removeFromCart, reloadCart } = useContext(CartContext);
    const [step, setStep] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(20000)
    const [promoCode, setPromoCode] = useState("");
    const [validatedPromoCode, setValidatedPromoCode] = useState("");
    const [discountedAmount, setDiscountedAmount] = useState(0);

    const stepTitles = ["Thông tin đơn hàng", "Thông tin giao hàng", "Thanh toán"];
    const stepIcons = [<FiFileText />, <FiTruck />, <FiCreditCard />];

    const [customer, setCustomer] = useState(null);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editAddressForm, setEditAddressForm] = useState({
        id: null, name: "", phone: "", street: "", ward: "", district: "", city: "", isMain: false
    });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [selectedName, setSelectedName] = useState(null);
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("")

    // Only persist selected item variantIds
    const [selectedItems, setSelectedItems] = useState(() => {
        const saved = localStorage.getItem("selectedItems");
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem("selectedItems", JSON.stringify(selectedItems));
    }, [selectedItems]);

    useEffect(() => {
        if (!selectedItems || selectedItems.length === 0) {
            navigate(-1);
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
        if (!code) return showPopup("Vui lòng nhập mã khuyến mãi");
        const categoryIds = [...new Set(selectedCartItems.map(item => item.categoryId))];
        const brandIds = [...new Set(selectedCartItems.map(item => item.brandId))];
        const res = await validatePromotionCode(
            code,
            selectedSubtotal,
            selectedCartItems.map(item => item.productId),
            categoryIds,
            brandIds
        );
        if (res.error) return showPopup(res.error);
        else if (!res.data.isValid) return showPopup(res.data.message);
        setValidatedPromoCode(res.data.discountAmount)
        setDiscountedAmount(code);
    };
    // console.log(selectedCartItems)

    // =========================
    const loadCustomer = async () => {
        const res = await getCustomerDetails(ownerId);
        if (res.error) return;
        setCustomer(res.data);
        setSelectedAddressId(res.data.addresses?.find(a => a.isMain)?.id || null)
    };

    const openAddressForm = (addr = null) => {
        if (addr) setEditAddressForm({ ...addr });
        else setEditAddressForm({ id: null, name: "", phone: "", street: "", ward: "", district: "", city: "", isMain: false });
        setShowAddressForm(true);
    };

    const handleSaveAddress = async () => {
        const { id, name, phone, street, ward, district, city } = editAddressForm;
        if (!name || !phone || !street || !ward || !district || !city) return showPopup("Vui lòng điền đầy đủ thông tin");

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
        if (paymentMethod === "")
            return showPopup("Vui lòng chọn phương thức thanh toán!")
        const orderItemRequest = selectedCartItems.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
        }));

        const res = await createOrder({
            items: orderItemRequest, shippingName: selectedName, shippingAddress: selectedAddress,
            shippingPhone: selectedPhone, paymentMethod: paymentMethod, promotionCode: validatedPromoCode, clearCart: false
        })
        if (res.error) return showPopup(res.error);

        const { requiresPayment, payment, order } = res.data;

        if (requiresPayment && payment?.paymentUrl) {
            window.location.href = payment.paymentUrl;
        } else {
            showPopup("Đặt hàng thành công!", "success", () => navigate("/customer", { replace: true }));

            setTimeout(() => {
                navigate("/customer", { replace: true });
            }, 500);
        }
    }


    return (
        <div className="px-40 pt-10 flex flex-col">
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
                                <p className="text-gray-500">Chưa chọn sản phẩm</p>
                            ) : (
                                selectedCartItems.map((item) => (
                                    <div key={item.id} className="flex p-3 border-b border-gray-300">
                                        <img src={item.imageUrls?.main} alt={item.variantName} className="w-20 h-20 object-cover rounded mr-6 hover:cursor-pointer" />
                                        <div className="min-h-[2.5rem] w-80 flex items-center">
                                            <p className="text-lg font-medium line-clamp-2 leading-tight">{item.variantName}</p>
                                        </div>
                                        <div className="flex-1 flex justify-between items-center ml-4">
                                            <div className="flex items-center space-x-2">
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
                            <span className="text-gray-600">Mã giảm giá</span>
                            <div className="relative mt-2">
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg pr-28 p-4 focus:outline-none focus:ring-1 focus:ring-black"
                                    placeholder="Nhập mã giảm giá"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value)}
                                />
                                <button onClick={() => handleValidatePromotionCode(promoCode)}
                                    className="absolute right-1 top-1 bottom-1 border border-black px-4 h-8 m-auto mr-4 rounded hover:bg-gray-200 transition hover:cursor-pointer">
                                    Kiểm tra
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-lg font-medium">Tiền sản phẩm</span>
                                <span className="text-lg font-medium">{selectedSubtotal.toLocaleString("vi-VN")}₫</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-lg text-gray-500 font-medium">Chi phí giao hàng & phát sinh</span>
                                <span className="text-lg font-medium">{(deliveryFee).toLocaleString("vi-VN")}₫</span>
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
                        .map(addr => (
                            <div key={addr.id} className={`bg-gray-100 rounded-lg py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow ${selectedAddressId === addr.id ? "ring-2 ring-black" : ""}`}>
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
                        : <p className="text-gray-500 italic">Chưa có địa chỉ nào</p>}

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
                                    <input type="text" placeholder="Tên người nhận" value={editAddressForm.name} onChange={e => setEditAddressForm(prev => ({ ...prev, name: e.target.value }))} className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black" />
                                    <input type="text" placeholder="SĐT" value={editAddressForm.phone} onChange={e => setEditAddressForm(prev => ({ ...prev, phone: e.target.value }))} className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black" />
                                    <input type="text" placeholder="Số nhà & đường" value={editAddressForm.street} onChange={e => setEditAddressForm(prev => ({ ...prev, street: e.target.value }))} className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black" />
                                    <input type="text" placeholder="Phường" value={editAddressForm.ward} onChange={e => setEditAddressForm(prev => ({ ...prev, ward: e.target.value }))} className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black" />
                                    <input type="text" placeholder="Quận/Huyện" value={editAddressForm.district} onChange={e => setEditAddressForm(prev => ({ ...prev, district: e.target.value }))} className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black" />
                                    <input type="text" placeholder="Thành phố/Tỉnh" value={editAddressForm.city} onChange={e => setEditAddressForm(prev => ({ ...prev, city: e.target.value }))} className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black" />
                                    <div className="flex gap-3 mt-2">
                                        <button onClick={() => setShowAddressForm(false)} className="px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer">Hủy</button>
                                        <button onClick={handleSaveAddress} className="px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer">{editAddressForm.id ? "Cập nhật" : "Thêm"}</button>
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
                                <span className="font-semibold">{(deliveryFee).toLocaleString("vi-VN")}₫</span>
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
                                <img src={codImg} alt="COD" className="w-15 h-15" />
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
                                <img src={vnpayImg} alt="VNPay" className="w-15 h-15" />
                                <span className="font-medium">Thanh toán trực tuyến (VNPay)</span>
                            </button>
                        </div>


                        <div className="flex justify-end gap-5 mt-10">
                            <button className="px-10 py-4 rounded border border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition" onClick={() => setStep(1)}>Quay lại</button>
                            <button className="bg-black text-white px-10 py-4 rounded hover:bg-gray-900 hover:cursor-pointer transition text-lg font-medium flex items-center justify-center gap-2 shadow" onClick={handleCheckout}>Thanh toán</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
