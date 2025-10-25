import { useState, useEffect, useContext } from "react";
import { FiEdit, FiPlus, FiTrash2, FiMapPin, FiPhone, FiStar, FiUser, FiPenTool } from "react-icons/fi";
import { FaPlusCircle, FaQuestionCircle, FaStar } from "react-icons/fa";
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
import { cancelOrder, getCustomerOrders } from "../../apis/orderApi";
import { CartContext } from "../../contexts/CartContext";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { FaCircleXmark, FaMoneyBillTransfer, FaX } from "react-icons/fa6";
import { PopupContext } from "../../contexts/PopupContext";

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

  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [forceLogout, setForceLogout] = useState(false);
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });

  useEffect(() => {
    loadCustomer();
    loadOrders();
    reloadCart();
  }, []);

  useEffect(() => {
    loadOrders()
  }, [sortStatus])

  const loadCustomer = async () => {
    const res = await getCustomerDetails(ownerId);
    if (res.error) return showPopup("Lấy thông tin khách hàng thất bại!");

    setCustomer(res.data);
  };
  const loadOrders = async (page = 0) => {
    const res = await getCustomerOrders(page, size, sortStatus);
    if (res.error) return showPopup("Lấy thông tin đơn hàng thất bại!");
    setOrders(res.data.content);
    console.log(res.data.content)
    setTotalPage(res.data.totalPages)
    setPage(page)

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
    const res = await updateCustomer(editForm.fullName, editForm.phone, editForm.email, editForm.gender, editForm.dateOfBirth);
    if (res.error) return showPopup("Cập nhật thông tin thất bại");
    setCustomer(prev => ({ ...prev, ...editForm }));
    setShowEditForm(false);
    showPopup("Cập nhật thông tin thành công");
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
    showPopup("Xóa địa chỉ thành công");
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
      showPopup("Hủy đơn hàng thành công");
      loadOrders();
    }
  };


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
    <div className="px-40 py-10 bg-gray-50 min-h-screen">
      <div className="flex gap-10">
        {/* Left Panel: Addresses */}
        <div className="flex-4 ">
          <h2 className="text-xl font-bold mb-6">Lịch sử đơn hàng</h2>
          {/* Tabs */}
          <div className="flex justify-between gap-6 px-2 pb-2 mb-2">
            {[
              { key: "ALL", label: "Tất cả", color: "gray-900", icon: null },
              { key: "PENDING", label: "Chờ xác nhận", color: "yellow-500" },
              { key: "CONFIRMED", label: "Đã xác nhận", color: "blue-500" },
              { key: "PROCESSING", label: "Đang chuẩn bị", color: "orange-500" },
              { key: "SHIPPED", label: "Đang giao", color: "purple-500" },
              { key: "DELIVERED", label: "Đã giao", color: "green-500" },
              { key: "CANCELLED", label: "Đã hủy", color: "red-500" },
              { key: "RETURNED", label: "Trả lại", color: "gray-500" },
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

          <div className="flex flex-col gap-6">
            {orders.map(order => (
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
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-black text-white text-sm rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-pre-wrap pointer-events-none">
                                {order.notes}
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
                  <p className="text-gray-600 text-sm font-medium">
                    {new Date(order.orderDate).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                  </p>
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
                        className="min-h-[2.5rem] w-72 flex items-center hover:cursor-pointer"
                        onClick={() => navigate(`/product/${item.productSlug}?sku=${item.variantSku}`)}
                      >
                        <p className="text-lg font-medium line-clamp-2 leading-tight text-gray-800">{item.variantName}</p>
                      </div>

                      {/* Quantity & Total Price */}
                      <div className="flex-1 flex justify-end items-center space-x-3">
                        <span className=" rounded  flex justify-center items-center font-medium">
                          x{item.quantity}
                        </span>
                        <span className="text-gray-800 font-semibold">{item.totalPrice.toLocaleString("vi-VN")}₫</span>
                      </div>
                    </div>
                  ))}

                  {/* Order summary (Fee, Discount, Total) */}
                  <div className="flex justify-end mt-2">
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 w-55 text-right items-center">
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

                {/* Actions */}
                <div className="flex gap-2 justify-end mr-3">
                  {order.statusName === "DELIVERED" && (
                    <button className="px-6 py-3 border border-black rounded hover:bg-gray-100 hover:cursor-pointer font-medium">
                      <FiEdit></FiEdit> Đánh giá
                    </button>
                  )}

                  {order.paymentMethod !== "COD" && order.paymentStatus === "PENDING" && (
                    <button className="flex gap-2 items-center px-6 py-3 bg-black text-white rounded hover:bg-gray-800 hover:cursor-pointer font-medium">
                      <FaMoneyBillTransfer></FaMoneyBillTransfer> Thanh toán
                    </button>
                  )}
                  {order.statusName !== "DELIVERED" && order.statusName !== "CANCELLED" && (
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
                  )}

                </div>
              </div>
            ))}
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
          <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
            <h2 className="font-bold text-black text-lg">Thông tin cá nhân</h2>
            <p className="text-gray-700"><strong>Họ và tên:</strong> {customer?.fullName}</p>
            <p className="text-gray-700"><strong>Email:</strong> {customer?.email}</p>
            <p className="text-gray-700"><strong>SĐT:</strong> {customer?.phone}</p>
            <p className="text-gray-700"><strong>Giới tính:</strong> {customer?.gender}</p>
            <p className="text-gray-700"><strong>Ngày sinh:</strong> {customer?.dateOfBirth}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setEditForm(customer); setShowEditForm(true); }} className="px-5 py-2 bg-black text-white rounded hover:bg-gray-900 flex items-center gap-2 hover:cursor-pointer"><FiEdit /> Chỉnh sửa</button>
              <button onClick={() => setShowPasswordForm(true)} className="px-3 py-2 border border-black text-black rounded hover:bg-gray-100 flex items-center gap-2 hover:cursor-pointer">
                <FiPenTool></FiPenTool> Đổi mật khẩu</button>
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


            {showAddressForm && (
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
            )}
          </div>
        </div>
      </div>

      {/* ------------------- MODALS ------------------- */}
      {showEditForm && <Modal title="Chỉnh sửa khách hàng" >
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
        onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); setConfirmPanel({ visible: false, message: "", onConfirm: null }); }}
        onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
      />
    </div>
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
      <input
        id="district"
        type="text"
        placeholder="Nhập quận/ huyện"
        value={editAddressForm.district}
        onChange={e => setEditAddressForm(prev => ({ ...prev, district: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
    </div>

    <div className="flex flex-col gap-1">
      <label htmlFor="city" className="text-gray-700 font-medium">Thành phố/ Tỉnh</label>
      <input
        id="city"
        type="text"
        placeholder="Nhập thành phố/ tỉnh"
        value={editAddressForm.city}
        onChange={e => setEditAddressForm(prev => ({ ...prev, city: e.target.value }))}
        className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
      />
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

