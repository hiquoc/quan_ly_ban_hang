import { useState, useEffect, useContext } from "react";
import {
  FiEdit, FiPlus, FiTrash2, FiMapPin, FiPhone, FiStar,
  FiUser, FiPenTool, FiShoppingCart, FiDollarSign, FiTrendingUp
} from "react-icons/fi";
import { FaBoxOpen, FaImage, FaPhoneAlt, FaPlusCircle, FaQuestionCircle, FaStar } from "react-icons/fa";
import { FaClock, FaCheckCircle, FaSpinner, FaTruck, FaCheck, FaTimes, FaUndo } from 'react-icons/fa';
import { AuthContext } from "../../contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import {
  changMainAddress,
  createAddress,
  getCustomerDetails,
  updateCustomer,
  updateAddress,
  deleteAddress
} from "../../apis/customerApi";
import ConfirmPanel from "../../components/ConfirmPanel";
import { changePassword } from "../../apis/authApi";
import { cancelOrder, changeAddressForOrder, confirmDeliveredOrder, getCustomerOrders, getCustomerOrderStats, getDeliveredImageUrls, rePayPayment } from "../../apis/orderApi";
import { CartContext } from "../../contexts/CartContext";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FaBoxArchive, FaCircleXmark, FaMoneyBillTransfer, FaX } from "react-icons/fa6";
import { PopupContext } from "../../contexts/PopupContext";
import VerificationSection from "../../components/VerificationSection";
import CreateReviewModal from "../../components/CreateReviewModal";
import { getCustomerReviews } from "../../apis/productApi";
import { Helmet } from "react-helmet-async";
import ReturnOrderModal from "../../components/ReturnOrderModal";


export default function CustomerPage() {
  const { role, ownerId } = useContext(AuthContext);
  const { reloadCart } = useContext(CartContext);
  const { showPopup } = useContext(PopupContext)
  const navigate = useNavigate();
  if (role !== "CUSTOMER") return <Navigate to="/" replace />;

  const [customer, setCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", email: "", gender: "", dateOfBirth: "" });
  const [editAddressForm, setEditAddressForm] = useState({ id: null, name: "", phone: "", street: "", ward: "", district: "", city: "", isMain: false });
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });

  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(0)
  const [totalPage, setTotalPage] = useState(0)
  const [size, setSize] = useState(5)
  const [sortStatus, setSortStatus] = useState(null)
  const [orderStats, setOrderStats] = useState(null)

  const [showEditForm, setShowEditForm] = useState(false);
  const [initalEmail, setInitalEmail] = useState("")
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [forceLogout, setForceLogout] = useState(false);
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  //const [returnOrderForm, setReturnOrderForm] = useState({ visible: false, order: null })

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showVerifyPanel, setShowVerifyPanel] = useState(false)
  const [reviewingProduct, setReviewingProduct] = useState({ variantName: "", variantId: null, orerId: null })
  const [reviewList, setReviewList] = useState([])
  const [showChangeAddressPanel, setShowChangeAddressPanel] = useState({ visible: false, orderId: null, oldName: "", oldPhone: "", oldAddress: "", newAddressId: null });
  const [showDeliveryImages, setShowDeliveryImages] = useState(null);
  const [showCustomerService, setShowCustomerService] = useState(false);

  useEffect(() => {
    loadCustomer();
    // loadOrders();
    reloadCart();
    loadCustomerOrderStats()
  }, []);

  useEffect(() => {
    loadOrders()
  }, [sortStatus])

  const loadCustomer = async () => {
    const res = await getCustomerDetails(ownerId);
    if (res.error) return showPopup("Lấy thông tin khách hàng thất bại!");

    setCustomer(res.data);
    setInitalEmail(res.data.email);
  };
  const loadOrders = async (page = 0) => {
    try {
      setIsLoading(true);
      const res = await getCustomerOrders(page, size, sortStatus);
      if (res.error) return showPopup("Lấy thông tin đơn hàng thất bại!");
      setOrders(res.data.content);
      setTotalPage(res.data.totalPages)
      setPage(page)
      // console.log(res.data.content)
      if (res.data.content.some(order => order.statusName === "DELIVERED"))
        loadCustomerReviews()
    } finally {
      setIsLoading(false);
    }
  }
  const loadCustomerReviews = async () => {
    const res = await getCustomerReviews();
    if (res.error)
      return showPopup("Lỗi khi lấy lịch sử đánh giá!");
    setReviewList(res.data)
  }
  const loadCustomerOrderStats = async () => {
    const res = await getCustomerOrderStats();
    if (res.error)
      return showPopup(res.error)
    setOrderStats(res.data)
  }
  const handleRePayPayment = async (id) => {
    const res = await rePayPayment(id);
    if (res.error)
      return showPopup(res.error)
    console.log(res.data)
    if (res.data?.paymentUrl) {
      window.location.href = res.data.paymentUrl;
    }
  }
  // -------------------- HANDLERS --------------------
  const handleUpdateCustomer = async () => {
    if (editForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        setPopup({ message: "Email không đúng định dạng!", type: "error" });
        return;
      }
    }
    if (editForm.phone) {
      const phoneRegex = /^[0-9]{9,12}$/;
      if (!phoneRegex.test(editForm.phone)) {
        setPopup({ message: "Số điện thoại không hợp lệ!", type: "error" });
        return;
      }
    }
    if (editForm.email !== initalEmail) {
      return setShowVerifyPanel(true);
    }
    updateCustomerAPI();
  };
  const updateCustomerAPI = async () => {
    try {
      setIsProcessing(true);
      const res = await updateCustomer(editForm.fullName, editForm.phone, editForm.email, editForm.gender, editForm.dateOfBirth);
      if (res.error) return showPopup(res.error);
      setCustomer(prev => ({ ...prev, ...editForm }));
      setShowEditForm(false);
      // showPopup("Cập nhật thông tin thành công");
    } finally {
      setIsProcessing(false);
    }
  }

  const openAddressForm = (addr = null) => {
    if (addr) setEditAddressForm({ ...addr });
    else setEditAddressForm({ id: null, name: "", phone: "", street: "", ward: "", district: "", city: "", isMain: false });
    setShowAddressForm(true);
  };

  const handleSaveAddress = async () => {
    const { id, name, phone, street, ward, district, city } = editAddressForm;
    if (!name?.trim()) return showPopup("Vui lòng nhập tên người nhận");
    if (!phone?.trim()) return showPopup("Vui lòng nhập số điện thoại");
    if (!/^\d{9,12}$/.test(phone)) return showPopup("Số điện thoại không hợp lệ");
    if (!street?.trim()) return showPopup("Vui lòng nhập số nhà / tên đường");
    if (!ward?.trim()) return showPopup("Vui lòng nhập phường / xã");
    if (!district?.trim()) return showPopup("Vui lòng nhập quận / huyện");
    if (!city?.trim()) return showPopup("Vui lòng nhập thành phố / tỉnh");
    try {
      setIsProcessing(true);
      if (id) {
        const res = await updateAddress(id, name, phone, street, ward, district, city);
        if (res.error) return showPopup(res.error || "Cập nhật địa chỉ thất bại");
        setCustomer(prev => ({
          ...prev,
          addresses: prev.addresses.map(a => (a.id === id ? { ...a, name, phone, street, ward, district, city } : a))
        }));
      } else {
        const res = await createAddress(name, phone, street, ward, district, city);
        if (res.error) return showPopup(res.error || "Thêm địa chỉ thất bại");
        const newAddr = { ...editAddressForm, id: res.data, isMain: false };
        setCustomer(prev => ({ ...prev, addresses: [...prev.addresses, newAddr] }));
      }
      setShowAddressForm(false);
      showPopup(id ? "Cập nhật địa chỉ thành công" : "Thêm địa chỉ thành công");
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
    setIsProcessing(true);
    try {
      const res = await deleteAddress(id);
      if (res.error) return showPopup("Xóa địa chỉ thất bại");
      setCustomer(prev => ({ ...prev, addresses: prev.addresses.filter(a => a.id !== id) }));
      // showPopup("Xóa địa chỉ thành công");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) return showPopup("Điền đầy đủ thông tin");
    if (passwordForm.new.length < 6) return showPopup("Mật khẩu phải có ít nhất 6 kí tự!")
    if (passwordForm.new !== passwordForm.confirm) return showPopup("Mật khẩu không khớp!");
    const res = await changePassword(passwordForm.new, passwordForm.current);
    if (res.error) return showPopup(res.error);
    setPasswordForm({ current: "", new: "", confirm: "" });
    setShowPasswordForm(false);
    setForceLogout(true);
  };

  const formattedEditForm = { ...editForm, dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth.split("T")[0] : "" };

  const handleCancelOrder = async (orderId) => {
    const res = await cancelOrder(orderId, "Người dùng tự hủy đơn.");
    if (res.error) {
      showPopup(res.error);
    } else {
      showPopup("Hủy đơn hàng thành công!");
      loadOrders();
    }
  };

  const handleChangeAddressForOrder = async (orderId, addressId) => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      const address = customer.addresses.find(addr => addr.id === addressId);
      const addressString = `${address.street}, ${address.ward}, ${address.district}, ${address.city}`;
      const res = await changeAddressForOrder(orderId, address.name, address.phone, addressString);
      if (res.error) {
        showPopup(res.error);
      } else {
        showPopup("Cập nhật địa chỉ thành công!");
        setOrders(prev => prev.map(order => order.id === orderId ? { ...order, shippingName: address.name, shippingPhone: address.phone, shippingAddress: addressString } : order));
      }
    } finally {
      setIsProcessing(false);
    }
  }

  const getPaymentButton = (order) => {
    let bgColor, label, onClick;

    if (order.paymentMethod === "COD") {
      bgColor = "bg-orange-500";
      label = "Thanh toán khi nhận";
      onClick = null;
    } else if (order.paymentStatus === "PAID") {
      bgColor = "bg-green-500";
      label = "Đã thanh toán";
    } else if (order.paymentStatus === "FAILED") {
      bgColor = "bg-red-500";
      onClick = () => handleRePayPayment(order.id);
      label = "Thanh toán thất bại";
    }
    else {
      bgColor = "bg-black hover:bg-gray-800";
      label = "Thanh toán";
      onClick = () => handleRePayPayment(order.id);
    }
    return (
      <button
        onClick={onClick}
        className={`flex gap-2 items-center px-6 py-3 text-white rounded font-medium ${bgColor} ${!onClick ? "" : "hover:cursor-pointer"}`}
      >
        {order.paymentMethod === "COD" ? <FaBoxOpen /> : <FaMoneyBillTransfer />}
        {label}
      </button>
    );
  }
  function getPageNumbers() {
    const pages = [];
    const maxVisible = 4;
    if (totalPage <= maxVisible + 2) {
      for (let i = 0; i < totalPage; i++) pages.push(i);
    } else {
      if (page <= 2) {
        pages.push(0, 1, 2, 3, "...", totalPage - 1);
      } else if (page >= totalPage - 3) {
        pages.push(0, "...", totalPage - 4, totalPage - 3, totalPage - 2, totalPage - 1);
      } else {
        pages.push(0, "...", page - 1, page, page + 1, "...", totalPage - 1);
      }
    }
    return pages;
  }
  return (
    <>
      <Helmet>
        <title>Cá nhân</title></Helmet>
      <div className="px-20 py-10 bg-gray-50 min-h-screen">
        <div className="flex gap-10">
          {/* Left Panel: Addresses */}
          <div className="flex-4 ">
            <div className="bg-white rounded-lg shadow px-6 pb-2 pt-4 mb-4">
              <h2 className="text-xl font-bold mb-4">Lịch sử đơn hàng</h2>
              {/* Tabs */}
              <div className="flex justify-between gap-2 ">
                {[
                  { key: "ALL", label: "Tất cả", color: "gray-900", icon: null },
                  { key: "PENDING", label: "Chờ xác nhận", color: "yellow-500" },
                  { key: "CONFIRMED", label: "Đã xác nhận", color: "blue-500" },
                  { key: "PROCESSING", label: "Đang xử lý", color: "orange-500" },
                  { key: "SHIPPED", label: "Đang giao", color: "purple-500" },
                  { key: "DELIVERED", label: "Đã giao", color: "green-500" },
                  { key: "CANCELLED", label: "Đã hủy", color: "red-500" },
                  // { key: "RETURNED", label: "Trả lại", color: "gray-500" },
                ].map(tab => {
                  const isActive = sortStatus === tab.key || (tab.key === "ALL" && !sortStatus);
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSortStatus(tab.key === "ALL" ? null : tab.key)}
                      className={`flex items-center gap-2 font-semibold transition-all pb-2 border-b-2
          ${isActive
                          ? `text-${tab.color} border-${tab.color}`
                          : "text-gray-700 border-transparent hover:text-black"
                        }`}
                    >
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>


            <div className="flex flex-col gap-6">
              {isLoading ? (
                <div className="w-full flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải...</p>
                  </div>
                </div>
              ) : (orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <img
                    src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1763266848/girl-holding-empty-shopping-cart-illustration-svg-download-png-10018095_adkwbf.png"
                    alt="Empty Orders"
                    className="w-64 h-64 mb-6 opacity-80"
                  />
                  <h2 className="text-2xl font-semibold text-gray-700">
                    Danh sách đơn hàng trống
                  </h2>
                </div>
              ) : (
                orders.map(order => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow flex flex-col gap-4"
                  >
                    {/* Header: Status & Time */}
                    <div className="flex px-3 justify-between items-center">

                      {/* Status */}
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        {order.statusName === "PENDING" && (
                          <>
                            <FaClock className="text-yellow-500" />
                            <span className="text-yellow-500">Đang chờ</span>
                          </>
                        )}
                        {order.statusName === "CONFIRMED" && (
                          <>
                            <FaCheckCircle className="text-blue-500" />
                            <span className="text-blue-500">Đã xác nhận</span>
                          </>
                        )}
                        {order.statusName === "PROCESSING" && (
                          <>
                            <FaSpinner className="text-orange-500 animate-spin" />
                            <span className="text-orange-500">Đang xử lý</span>
                          </>
                        )}
                        {order.statusName === "SHIPPED" && (
                          <>
                            <FaTruck className="text-purple-500" />
                            <span className="text-purple-500">Đang giao</span>
                          </>
                        )}
                        {order.statusName === "DELIVERED" && (
                          <>
                            <FaCheck className="text-green-500" />
                            <span className="text-green-500">Đã giao</span>
                          </>
                        )}
                        {order.statusName === "CANCELLED" && (
                          <>
                            <FaTimes className="text-red-500" />
                            <span className="text-red-500 flex items-center gap-2">
                              Đã hủy
                              {order.notes && (
                                <div className="relative group items-center">
                                  <FaQuestionCircle className="text-red-500 text-lg font-bold cursor-help mb-0.5" />
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-black text-white text-sm rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-pre-wrap pointer-events-none">
                                    {order.notes.replace(/\s*-\s*Kho:.*$/, "")}
                                  </div>
                                </div>
                              )}
                            </span>
                          </>
                        )}

                        {order.statusName === "RETURNED" && (
                          <>
                            <FaUndo className="text-gray-500" />
                            <span className="text-gray-500">Trả lại</span>
                          </>
                        )}
                      </div>

                      {/* Order Time */}
                      <div className="flex flex-col gap-2">
                        <p className="text-gray-600 text-sm font-medium">
                          Mã đơn: {order.orderNumber}
                        </p>
                        <p className="text-gray-600 text-sm font-medium">
                          {order.deliveredDate
                            ? `${new Date(order.deliveredDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${new Date(order.deliveredDate).toLocaleDateString("vi-VN")}`
                            : order.cancelledDate
                              ? `${new Date(order.cancelledDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${new Date(order.cancelledDate).toLocaleDateString("vi-VN")}`
                              : `${new Date(order.orderDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${new Date(order.orderDate).toLocaleDateString("vi-VN")}`
                          }
                        </p>
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="flex flex-col gap-3 pt-2 px-3">

                      {order.items.map(item => (
                        <div
                          key={item.id}
                          className="flex p-3 bg-gray-100 rounded-xl items-center hover:shadow-sm transition-shadow"
                        >
                          {/* Product Image */}
                          <img
                            src={item.imageUrl}
                            alt={item.variantName}
                            className="w-20 h-20 object-cover rounded mr-4 hover:cursor-pointer"
                            onClick={() => navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)}
                          />

                          {/* Product Name */}
                          <div
                            className="min-h-[2.5rem] w-90 flex items-center hover:cursor-pointer"
                            onClick={() => navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)}
                          >
                            <p className="text-lg font-medium line-clamp-2 leading-tight text-gray-800">{item.variantName}</p>
                          </div>

                          {/* Quantity & Total Price */}
                          <div className="flex-1 flex justify-end items-center space-x-3">
                            {order.statusName === "DELIVERED" && (
                              <button
                                className="ml-2 hover:scale-110 flex items-center justify-center"
                                onClick={() => {
                                  if (!reviewList.some(review => review.variantId === item.variantId)) {
                                    setIsReviewModalOpen(true);
                                    setReviewingProduct({ variantName: item.variantName, variantId: item.variantId, orderId: order.id })
                                  }
                                  else
                                    navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)
                                }}
                                title="Đánh giá sản phẩm này"
                                style={{ lineHeight: 0 }}
                              >
                                <FiEdit />
                              </button>
                            )}

                            <span className="rounded flex justify-center items-center font-medium">
                              x{item.quantity}
                            </span>

                            <span className="text-gray-800 font-semibold w-30 text-right">{item.totalPrice.toLocaleString("vi-VN")}₫</span>
                          </div>

                        </div>
                      ))}

                      <div className="flex flex-col gap-4 w-full">
                        <div className="flex justify-between items-start gap-6 w-full mt-2">

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center max-w-140 gap-4">
                              <FiMapPin className="text-black text-xl " />
                              <p className="text-gray-800 break-words">{order.shippingAddress}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <FiUser className="text-black text-xl" />
                              <p className="text-gray-800">{order.shippingName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <FiPhone className="text-black text-xl" />
                              <p className="text-gray-800">{order.shippingPhone}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-[0.35rem] w-60 text-right items-center">
                            <span className=" text-gray-600">Tạm tính:</span>
                            <span className="text-gray-800 font-semibold">{order.subtotal.toLocaleString()}₫</span>

                            {order.fee > 0 && (
                              <>
                                <span className="text-gray-600">Phí vận chuyển:</span>
                                <span className="text-gray-800 font-semibold">{order.fee.toLocaleString()}₫</span>
                              </>
                            )}
                            {order.discountAmount > 0 && (
                              <>
                                <span className="text-red-500">Giảm giá:</span>
                                <span className="text-red-500">{order.discountAmount.toLocaleString()}₫</span>
                              </>
                            )}
                            <span className="font-semibold text-gray-800">Tổng:</span>
                            <span className="font-semibold text-red-500 text-lg">{order.totalAmount.toLocaleString()}₫</span>
                          </div>
                        </div>
                      </div>


                    </div>

                    <div className="flex items-center justify-between w-full">
                      <div>
                        {(order.statusName === "PENDING" || order.statusName === "CONFIRMED") && (
                          <button
                            onClick={() => setShowChangeAddressPanel({
                              visible: true, orderId: order.id, oldName: order.shippingName, oldPhone: order.shippingPhone,
                              oldAddress: order.shippingAddress, newAddressId: null
                            })}
                            className="flex gap-2 items-center px-6 py-3 border border-black rounded hover:bg-gray-100 font-medium"
                          >
                            <FiMapPin /> Cập nhật địa chỉ
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 mr-3">
                        {order.statusName === "PENDING" && (
                          <>
                            {getPaymentButton(order)}
                            <button
                              onClick={() =>
                                setConfirmPanel({
                                  visible: true,
                                  message: "Bạn có chắc chắn muốn hủy đơn hàng này?",
                                  onConfirm: () => handleCancelOrder(order.id)
                                })
                              }
                              className="flex gap-2 items-center px-6 py-3 bg-rose-600 text-white rounded hover:bg-rose-700 hover:cursor-pointer font-medium"
                            >
                              <FaCircleXmark /> Hủy đơn
                            </button>
                          </>
                        )}
                      </div>
                      <div>
                        {order.statusName === "DELIVERED" && (
                          <button onClick={async () => {
                            const res = await getDeliveredImageUrls(order.id);
                            if (res.error) {
                              showPopup(res.error);
                              return;
                            }
                            const imageUrls = res.data;
                            setShowDeliveryImages({ orderId: order.id, urls: imageUrls });
                          }} className="flex gap-2 items-center px-6 py-3 border rounded hover:bg-gray-200 hover:cursor-pointer font-medium"
                          >
                            <FaImage /> Hình ảnh giao hàng
                          </button>
                        )}
                      </div>
                      <div>
                        {order.statusName === "DELIVERED" && order.userConfirmedAt != null && (
                          <div className="flex gap-2 mr-3">
                            <button
                              onClick={() =>
                                setConfirmPanel({
                                  visible: true,
                                  message: "Xác nhận đã nhận hàng?",
                                  onConfirm: () => confirmDeliveredOrder(order.id)
                                })
                              }
                              className="flex gap-2 items-center px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 hover:cursor-pointer font-medium"
                            >
                              <FaBoxOpen /> Đã nhận được hàng
                            </button>
                            <button
                              onClick={() => setShowCustomerService(true)}
                              className="flex gap-2 items-center px-6 py-3 border border-red-500 text-red-500 rounded hover:bg-red-50 hover:cursor-pointer font-medium"
                            >
                              <FaPhoneAlt /> Chưa nhận được hàng
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))))}
            </div>


            {totalPage > 0 && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <button
                  onClick={() => page > 0 && loadOrders(page - 1)}
                  disabled={page === 0}
                  className={`p-3 rounded ${page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                >
                  <FaChevronLeft />
                </button>

                {getPageNumbers().map((num, i) =>
                  num === "..." ? (
                    <span key={i} className="px-2 text-gray-500">...</span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => loadOrders(num)}
                      className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                              ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                    >
                      {num + 1}
                    </button>
                  )
                )}

                <button
                  onClick={() => page < totalPage - 1 && loadOrders(page + 1)}
                  disabled={page === totalPage - 1}
                  className={`p-3 rounded ${page === totalPage - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}

          </div>


          {/* Right Panel: Customer Info + Password */}
          <div className="flex flex-3 flex-col gap-4">
            <div className="flex justify-between bg-white rounded-xl shadow p-6 ">
              <div className="flex-1 flex flex-col gap-4 ">
                <h2 className="font-bold text-black text-lg">Thông tin cá nhân</h2>
                <p className="flex text-gray-700 items-center">
                  <strong>Họ và tên:</strong>
                  <span
                    className="ml-1 max-w-[300px] inline-block overflow-hidden text-ellipsis whitespace-nowrap"
                    title={customer?.fullName}
                  >
                    {customer?.fullName || "-"}
                  </span>
                </p>

                <p className="flex text-gray-700 items-center">
                  <strong>Email:</strong>
                  <span class="ml-1 max-w-[200px] inline-block overflow-hidden text-ellipsis whitespace-nowrap"
                    title={customer?.email}
                  >
                    {customer?.email || "-"}
                  </span>
                </p>
                <p className="text-gray-700"><strong>SĐT:</strong> {customer?.phone || "-"}</p>
                <p className="text-gray-700"><strong>Giới tính:</strong> {customer?.gender === "MALE" ? "Nam" : customer?.gender === "FEMALE" ? "Nữ" : "-"}</p>
                <p className="text-gray-700"><strong>Ngày sinh:</strong> {customer?.dateOfBirth || "-"}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setEditForm(customer); setShowEditForm(true); }} className="px-5 py-2 bg-black text-white rounded hover:bg-gray-900 flex items-center gap-2 hover:cursor-pointer"><FiEdit /> Chỉnh sửa</button>
                  <button onClick={() => setShowPasswordForm(true)} className="px-3 py-2 border border-black text-black rounded hover:bg-gray-100 flex items-center gap-2 hover:cursor-pointer">
                    <FiPenTool></FiPenTool> Đổi mật khẩu</button>
                </div>
              </div>
              <div className="w-2/5 flex flex-col gap-4">
                <h2 className="font-bold text-black text-lg">Thống kê</h2>

                <div className="grid grid-cols-1 gap-4">

                  {/* Total Orders */}
                  <div className="p-3 bg-white border border-gray-300 rounded-xl shadow-sm flex items-center gap-2 hover:shadow-md transition">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full text">
                      <FiShoppingCart />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Tổng đơn</p>
                      <p className="text-lg font-bold">{orderStats?.totalOrders}</p>
                    </div>
                  </div>

                  {/* Total Spent */}
                  <div className="p-3 bg-white border border-gray-300 rounded-xl shadow-sm flex items-center gap-2 hover:shadow-md transition">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full text">
                      <FiDollarSign />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Tổng chi tiêu</p>
                      <p className="text-lg font-bold">{orderStats?.totalSpent?.toLocaleString()} ₫</p>
                    </div>
                  </div>

                  {/* Average Order */}
                  <div className="p-3 bg-white border border-gray-300 rounded-xl shadow-sm flex items-center gap-2 hover:shadow-md transition">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full text">
                      <FiTrendingUp />
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Giá trị TB/đơn</p>
                      <p className="text-lg font-bold">
                        {Math.floor(orderStats?.averageOrderValue).toLocaleString("vi-VN")} ₫
                      </p>
                    </div>
                  </div>

                </div>
              </div>


            </div>

            <div className="p-6 flex flex-col gap-4 border border-gray-200 rounded-lg shadow bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-black">Địa chỉ nhận hàng</h2>

                <button
                  onClick={() => openAddressForm()}
                  className="flex gap-2 items-center px-4 py-2.5 bg-black text-white rounded hover:bg-gray-900 hover:cursor-pointer"
                ><FaPlusCircle></FaPlusCircle>
                  Thêm địa chỉ
                </button>
              </div>

              {customer?.addresses?.length ? customer.addresses
                .slice()
                .sort((a, b) => Number(b.isMain) - Number(a.isMain))
                .map(addr => (
                  <div
                    key={addr.id}
                    className={`bg-gray-100 rounded-lg py-4 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">

                      <div className="ml-2 space-y-2">
                        <div className="flex gap-3 items-center">
                          <FiUser className="text-xl flex-shrink-0" />
                          <p className="text-lg font-semibold text-black">{addr.name}</p>
                        </div>

                        <div className="flex gap-3 items-center">
                          <FiMapPin className="text-xl flex-shrink-0" />
                          <p className="text-gray-700 line-clamp-1" title={`${addr.street}, ${addr.ward}, ${addr.district}, ${addr.city}`}>
                            {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                          </p>
                        </div>

                        <div className="flex gap-3 items-center">
                          <FiPhone className="text-xl flex-shrink-0" />
                          <p className="text-gray-700">{addr.phone}</p>
                        </div>
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


              {/* {showAddressForm && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
                  <div className="bg-white rounded-xl shadow-lg p-6 w-[500px]">
                    <h3 className="font-bold text-black text-xl mb-4">
                      {editAddressForm.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        placeholder="Tên người nhận"
                        value={editAddressForm.name}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, name: e.target.value }))}
                        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder="SĐT"
                        value={editAddressForm.phone}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder="Số nhà & đường"
                        value={editAddressForm.street}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, street: e.target.value }))}
                        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder="Phường"
                        value={editAddressForm.ward}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, ward: e.target.value }))}
                        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder="Quận/Huyện"
                        value={editAddressForm.district}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, district: e.target.value }))}
                        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        type="text"
                        placeholder="Thành phố/Tỉnh"
                        value={editAddressForm.city}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, city: e.target.value }))}
                        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      />

                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => setShowAddressForm(false)}
                          className="px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveAddress}
                          className="px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer"
                        >
                          {editAddressForm.id ? "Cập nhật" : "Thêm"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>

        {/* ------------------- MODALS ------------------- */}
        {showEditForm && <Modal title="Cập nhật thông tin" >
          <CustomerEditForm editForm={formattedEditForm} setEditForm={setEditForm} onSave={handleUpdateCustomer} onClose={() => setShowEditForm(false)} />
        </Modal>}

        {showAddressForm && <Modal title={editAddressForm.id ? "Sửa địa chỉ" : "Thêm địa chỉ"} >
          <AddressForm editAddressForm={editAddressForm} setEditAddressForm={setEditAddressForm} onSave={handleSaveAddress} onClose={() => setShowAddressForm(false)} />
        </Modal>}

        {showPasswordForm && <Modal title="Đổi mật khẩu" >
          <ChangePasswordForm passwordForm={passwordForm} setPasswordForm={setPasswordForm} onSave={handleChangePassword} onClose={() => setShowPasswordForm(false)} />
        </Modal>}

        {forceLogout && <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center">
            <p className="text-xl mt-5 mb-5 ">Thay đổi mật khẩu thành công!<br />Vui lòng đăng nhập lại!</p>
            <button onClick={() => navigate("/logout")} className="px-6 py-3 mt-2 bg-black text-white rounded font-semibold hover:bg-gray-800 transition">Xác nhận</button>
          </div>
        </div>}

        <ConfirmPanel
          visible={confirmPanel.visible}
          message={confirmPanel.message}
          onConfirm={async () => {
            if (confirmPanel.onConfirm) {
              await confirmPanel.onConfirm();
            }
            setConfirmPanel({ visible: false, message: "", onConfirm: null })
          }}
          onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
        />

        {showVerifyPanel && (
          <VerificationSection
            email={editForm.email}
            setEmail={(value) => setEditForm((prev) => ({ ...prev, email: value }))}
            showPopup={showPopup}
            onVerified={updateCustomerAPI}
            onClose={() => setShowVerifyPanel(false)}
            secure={true}
          />
        )}
        <CreateReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={() => { loadCustomerReviews(); setIsReviewModalOpen(false) }}
          reviewingProduct={reviewingProduct}
          showPopup={showPopup}
        />
        {isProcessing && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[9999] pointer-events-auto">
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span className="text-gray-700 font-medium">Đang xử lý...</span>
            </div>
          </div>
        )}

        {showChangeAddressPanel.visible && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
            <div className="bg-white rounded-xl shadow-lg w-[700px] max-h-[80vh] flex flex-col p-6">
              <h3 className="font-bold text-black text-xl mb-4">Chọn địa chỉ giao hàng</h3>

              {/* Show current address */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-3">
                  Địa chỉ giao hàng hiện tại:
                </p>

                <div className="flex items-start gap-3">
                  <div className="ml-2 space-y-2 flex-1">
                    <div className="flex gap-3 items-center">
                      <FiUser className="text-xl text-blue-600 flex-shrink-0" />
                      <p className="text-lg font-semibold text-black">
                        {showChangeAddressPanel.oldName}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center">
                      <FiMapPin className="text-xl text-blue-600 flex-shrink-0" />
                      <p className="text-gray-700">
                        {showChangeAddressPanel.oldAddress}
                      </p>
                    </div>

                    <div className="flex gap-3 items-center">
                      <FiPhone className="text-xl text-blue-600 flex-shrink-0" />
                      <p className="text-gray-700">
                        {showChangeAddressPanel.oldPhone}
                      </p>
                    </div>

                  </div>
                </div>
              </div>


              <p className="text-sm font-medium text-gray-600 mb-1">Chọn địa chỉ mới:</p>

              <div className="space-y-3 mb-6 overflow-y-auto p-3 flex-1">
                {customer?.addresses?.length ? (
                  customer.addresses
                    .slice()
                    .sort((a, b) => Number(b.isMain) - Number(a.isMain))
                    .map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => setShowChangeAddressPanel({ ...showChangeAddressPanel, newAddressId: addr.id })}
                        className={`bg-gray-100 rounded-lg py-4 px-6 flex justify-between items-center hover:shadow-md transition-all cursor-pointer ${showChangeAddressPanel.newAddressId === addr.id ? 'ring-2 ring-black' : ''
                          }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <div className="ml-2 space-y-2 flex-1">
                            <div className="flex gap-3 items-center">
                              <FiUser className="text-xl flex-shrink-0" />
                              <p className="text-lg font-semibold text-black">{addr.name}</p>
                              {addr.isMain && (
                                <span className="px-2 py-0.5 bg-black text-white text-xs rounded">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 items-center">
                              <FiMapPin className="text-xl flex-shrink-0" />
                              <p className="text-gray-700 line-clamp-1" title={`${addr.street}, ${addr.ward}, ${addr.district}, ${addr.city}`}>
                                {addr.street}, {addr.ward}, {addr.district}, {addr.city}
                              </p>
                            </div>
                            <div className="flex gap-3 items-center">
                              <FiPhone className="text-xl flex-shrink-0" />
                              <p className="text-gray-700">{addr.phone}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <input
                            type="radio"
                            checked={showChangeAddressPanel.newAddressId === addr.id}
                            onChange={() => setShowChangeAddressPanel({ ...showChangeAddressPanel, newAddressId: addr.id })}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 italic text-center py-8">Chưa có địa chỉ nào</p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-400 bg-white sticky bottom-0">
                <button
                  onClick={() => setShowChangeAddressPanel({ visible: false, orderId: null, oldName: "", oldPhone: "", oldAddress: "", newAddressId: null })}
                  className="px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (showChangeAddressPanel.newAddressId) {
                      handleChangeAddressForOrder(showChangeAddressPanel.orderId, showChangeAddressPanel.newAddressId);
                      setShowChangeAddressPanel({ visible: false, orderId: null, oldName: "", oldPhone: "", oldAddress: "", newAddressId: null });
                    }
                  }}
                  disabled={!showChangeAddressPanel.newAddressId}
                  className={`px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer font-medium ${!showChangeAddressPanel.newAddressId ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
        {showDeliveryImages && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
              <button
                onClick={() => setShowDeliveryImages(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
              <h2 className="text-2xl font-semibold mb-6">Hình ảnh giao hàng</h2>
              <div className={`grid gap-4 ${showDeliveryImages.urls.length === 1 ? 'grid-cols-1 place-items-center' : 'grid-cols-2 md:grid-cols-3'}`}>
                {showDeliveryImages.urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Hình ảnh ${index + 1}`}
                    className={`w-full rounded-lg shadow-md ${showDeliveryImages.urls.length === 1 ? 'max-w-2xl' : 'h-64 object-cover'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        {showCustomerService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <button
                onClick={() => setShowCustomerService(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
              <h2 className="text-2xl font-semibold mb-4 text-red-600">Chưa nhận được hàng?</h2>

              <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="font-semibold text-blue-900 mb-2">Dịch vụ chăm sóc khách hàng</p>
                  <div className="flex items-center gap-2 text-blue-800">
                    <FaPhoneAlt className="text-sm" />
                    <a href="tel:0123456789" className="text-lg font-bold hover:underline">0123 456 789</a>
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                  <p className="font-semibold text-yellow-900 mb-2">⚠️ Trước khi liên hệ, vui lòng:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
                    <li>Kiểm tra lại <span className="font-semibold">hình ảnh giao hàng</span></li>
                    <li>Xác nhận địa chỉ giao hàng với người nhận</li>
                    <li>Kiểm tra với các thành viên gia đình/người nhận hộ</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-700">
                    Nếu sau khi kiểm tra vẫn chưa nhận được hàng, vui lòng liên hệ số hotline bên trên.
                    Chúng tôi sẽ hỗ trợ bạn trong thời gian sớm nhất.
                  </p>
                </div>

                <button
                  onClick={() => setShowCustomerService(false)}
                  className="w-full py-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
        {/* <ReturnOrderModal
          order={returnOrderForm.order}
          show={returnOrderForm.visible}
          onClose={() => setReturnOrderForm({ visible: false, order: null })}
          onSubmit={(selectedItems) => {
            setReturnOrderForm({ visible: false, order: null });
            setOrders(prevOrders =>
              prevOrders.map(order => {
                if (order.id !== returnOrderForm.order.id) return order;
                return {
                  ...order,
                  items: order.items.map(item => {
                    const selected = selectedItems.find(si => si.variantId === item.variantId);
                    return {
                      ...item,
                      returnRequested: selected ? true : item.returnRequested
                    };
                  })
                };
              })
            );
          }}
          showPopup={showPopup}
        /> */}
      </div>
    </>
  );
}

/** -------------------- Helper Components -------------------- **/

const Modal = ({ title, children }) => (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div className="bg-white rounded-xl shadow-lg p-6 w-[500px]">
      <h3 className="font-bold text-black text-xl mb-4">{title}</h3>
      {children}
    </div>
  </div>
);

const CustomerEditForm = ({ editForm, setEditForm, onSave, onClose }) => (
  <div className="grid grid-cols-1 gap-3">
    <div className="flex flex-col gap-1">
      <label htmlFor="fullName" className="text-gray-700 font-medium">Họ và tên</label>
      <input
        id="fullName"
        type="text"
        placeholder="Nhập họ và tên"
        value={editForm.fullName}
        onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex flex-col gap-1">
      <label htmlFor="email" className="text-gray-700 font-medium">Email</label>
      <input
        id="email"
        type="email"
        placeholder="Nhập email"
        value={editForm.email}
        onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex flex-col gap-1">
      <label htmlFor="phone" className="text-gray-700 font-medium">Số điện thoại</label>
      <input
        id="phone"
        type="text"
        placeholder="Nhập số điện thoại"
        value={editForm.phone}
        onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex flex-col gap-1">
      <span className="text-gray-700 font-medium">Giới tính</span>
      <div className="flex items-center gap-4">
        {["Nam", "Nữ", "Khác"].map(g => (
          <label key={g} className="flex items-center gap-2">
            <input
              type="radio"
              name="gender"
              value={g}
              checked={editForm.gender === g}
              onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
              className="accent-black w-4 h-4"
            />
            <span className="text-gray-700">{g}</span>
          </label>
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-1">
      <label htmlFor="dateOfBirth" className="text-gray-700 font-medium">Ngày sinh</label>
      <input
        id="dateOfBirth"
        type="date"
        value={editForm.dateOfBirth}
        onChange={e => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex gap-3 mt-2">
      <button onClick={onClose} className="px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer">Hủy</button>
      <button onClick={onSave} className="px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer">Lưu</button>
    </div>
  </div>
);

const AddressForm = ({ editAddressForm, setEditAddressForm, onSave, onClose }) => (
  <div className="grid grid-cols-1 gap-3">
    <div className="flex gap-3">
      <div className="w-7/12  flex flex-col gap-1">
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
      <div className="w-5/12  flex flex-col gap-1">
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
      <button onClick={onClose} className="px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer">Hủy</button>
      <button onClick={onSave} className="px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer">
        {editAddressForm.id ? "Cập nhật" : "Thêm"}
      </button>
    </div>
  </div>
);

const ChangePasswordForm = ({ passwordForm, setPasswordForm, onSave, onClose }) => (
  <div className="grid grid-cols-1 gap-3">
    <div className="flex flex-col gap-1">
      <label htmlFor="currentPassword" className="text-gray-700 font-medium">Mật khẩu hiện tại</label>
      <input
        id="currentPassword"
        type="password"
        placeholder="Nhập mật khẩu hiện tại"
        value={passwordForm.current}
        onChange={e => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex flex-col gap-1">
      <label htmlFor="newPassword" className="text-gray-700 font-medium">Mật khẩu mới</label>
      <input
        id="newPassword"
        type="password"
        placeholder="Nhập mật khẩu mới"
        value={passwordForm.new}
        onChange={e => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex flex-col gap-1">
      <label htmlFor="confirmPassword" className="text-gray-700 font-medium">Xác nhận mật khẩu mới</label>
      <input
        id="confirmPassword"
        type="password"
        placeholder="Nhập lại mật khẩu mới"
        value={passwordForm.confirm}
        onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex gap-3 mt-2">
      <button
        onClick={onClose}
        className="px-4 py-3 border border-black text-black rounded hover:bg-gray-100 flex-1 hover:cursor-pointer"
      >
        Hủy
      </button>
      <button
        onClick={onSave}
        className="px-4 py-3 bg-black text-white rounded hover:bg-gray-900 flex-1 hover:cursor-pointer"
      >
        Đổi mật khẩu
      </button>
    </div>
  </div>
);

