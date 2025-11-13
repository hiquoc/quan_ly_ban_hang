import { useEffect, useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { getAllOrders, getOrderDetails, updateOrderStatus } from "../../../apis/orderApi"; // adjust import path
import { FaQuestionCircle, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { PopupContext } from "../../../contexts/PopupContext";
import { FiEye, FiMapPin, FiPhone, FiRefreshCcw, FiUser } from "react-icons/fi";
import { createPortal } from "react-dom";
import { Helmet } from "react-helmet-async";

function AdminOrder() {
    const { role } = useContext(AuthContext);
    const { showPopup } = useContext(PopupContext);

    if (!["ADMIN", "MANAGER", "STAFF"].includes(role)) return <Navigate to="/" replace />;

    const [orders, setOrders] = useState([]);
    const [orderDetails, setOrderDetails] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);

    const [keyword, setKeyword] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortStatus, setSortStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [popup, setPopup] = useState({ message: "" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [confirmStatusPanel, setConfirmStatusPanel] = useState({
        visible: false,
        orderId: null,
        statusName: "",
        orderNumber: "",
    });
    const [confirmNotes, setConfirmNotes] = useState("");
    const [isProcessing, setIsProcessing] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const getData = async (page = currentPage) => {
        setIsLoading(true);
        const res = await getAllOrders(page, 20, sortStatus, keyword, startDate, endDate);
        if (res.error){
            setIsLoading(false);
            return showPopup(res.error);
        } 
        // console.log(res.data)
        setOrders(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setIsLoading(false);
    };

    useEffect(() => { getData(); }, [currentPage, sortStatus, startDate, endDate]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (e.target.closest(".status-dropdown")) return;
            setEditingOrderId(null);
        };
        const handleScroll = () => {
            setEditingOrderId(null);
        };
        document.addEventListener("click", handleClickOutside);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("click", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, []);

    const handleGetOrderDetails = async (ownerNumber) => {
        const res = await getOrderDetails(ownerNumber);
        if (res.error) return showPopup(res.error);
        console.log(res.data)
        setOrderDetails(res.data);
        setIsDetailOpen(true);
    }

    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    const statusBgColor = (status) => {
        switch (status) {
            case "PENDING": return "bg-yellow-500 text-white";
            case "CONFIRMED": return "bg-blue-500 text-white";
            case "PROCESSING": return "bg-orange-500 text-white";
            case "SHIPPED": return "bg-purple-500 text-white";
            case "DELIVERED": return "bg-green-500 text-white";
            case "CANCELLED": return "bg-rose-500 text-white";
            case "RETURNED": return "bg-gray-500 text-white";
            default: return "";
        }
    };
    const statusColor = (status) => {
        switch (status) {
            case "PENDING": return "text-yellow-600";
            case "CONFIRMED": return "text-blue-600";
            case "PROCESSING": return "text-orange-600";
            case "SHIPPED": return "text-purple-600";
            case "DELIVERED": return "text-green-600";
            case "CANCELLED": return "text-rose-600";
            case "RETURNED": return "text-gray-600";
            default: return "text-gray-700";
        }
    };

    const statusLabel = (status) => {
        switch (status) {
            case "PENDING": return "Đang chờ";
            case "CONFIRMED": return "Đã xác nhận";
            case "PROCESSING": return "Đang xử lý";
            case "SHIPPED": return "Đang giao";
            case "DELIVERED": return "Đã giao";
            case "CANCELLED": return "Đã hủy";
            case "RETURNED": return "Trả lại";
            default: return status;
        }
    };
    const paymentStatusMap = {
        PENDING: { label: "Chờ thanh toán", bg: "bg-yellow-500" },
        PAID: { label: "Đã thanh toán", bg: "bg-green-500" },
        FAILED: { label: "Thanh toán thất bại", bg: "bg-gray-500" },
        REFUNDED: { label: "Đã hoàn tiền", bg: "bg-purple-500" },
        CANCELLED: { label: "Đã hủy", bg: "bg-red-500" },
    };
    const allowedTransitions = {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["PROCESSING", "CANCELLED"],
        PROCESSING: ["CANCELLED"],
        SHIPPED: ["DELIVERED"],
        DELIVERED: [],
        CANCELLED: [],
        RETURNED: []
    };

    function getPaymentStatusLabel(status) {
        return paymentStatusMap[status]?.label || status;
    }
    function getPaymentStatusClass(status) {
        const mapping = paymentStatusMap[status];
        return mapping ? `${mapping.bg} ${mapping.text}` : "bg-gray-100 text-gray-800";
    }


    return (
        <>
            <Helmet>
                <title>Đơn hàng</title></Helmet>
            <div className="p-6 bg-white rounded min-h-screen pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-semibold text-gray-800">Đơn mua hàng</h2>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div className="flex gap-2 flex-wrap">
                        <input
                            type="text"
                            placeholder="Từ khóa..."
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700"
                        />
                        <button
                            onClick={() => getData(currentPage)}
                            className="px-5 py-2 bg-black text-white rounded hover:bg-gray-800"
                        >
                            Tìm
                        </button>

                        {/* Status filter */}
                        <select
                            value={sortStatus}
                            onChange={e => setSortStatus(e.target.value)}
                            className="p-2 border border-gray-700 rounded"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="PENDING">Đang chờ</option>
                            <option value="CONFIRMED">Đã xác nhận</option>
                            <option value="PROCESSING">Đang xử lý</option>
                            <option value="SHIPPED">Đang giao</option>
                            <option value="DELIVERED">Đã giao</option>
                            <option value="CANCELLED">Đã hủy</option>
                            <option value="RETURNED">Trả lại</option>
                        </select>
                    </div>

                    {/* Date filter + Refresh */}
                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="border p-2 rounded w-38"
                        />
                        <span>đến</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="border p-2 rounded w-38"
                        />
                        <button
                            onClick={() => getData()}
                            className="flex items-center px-4 py-2 border  rounded hover:bg-gray-100 transition"
                        >
                            <FiRefreshCcw className="h-5 w-5 mr-2" /> Làm mới
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-8 overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                        <thead className="bg-gray-200 text-gray-700 ">
                            <tr>
                                {["Mã đơn", "Mã khách hàng", "Ngày đặt", "Tổng tiền", "Trạng thái", "Thanh toán", "Chi tiết"].map(head => (
                                    <th key={head} className="p-3 border-b border-gray-200 text-center">{head}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-4 text-gray-500 text-center align-middle">
                                        <div className="inline-flex gap-2 items-center justify-center">
                                            <svg
                                                className="animate-spin h-5 w-5 text-black"
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
                                            Đang tải dữ liệu...
                                        </div>
                                    </td>
                                </tr>
                            ) : (orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-3 text-center text-gray-500">
                                        Không tìm thấy đơn hàng
                                    </td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition">
                                        <td className="p-3 border-b border-gray-200 text-center">{order.orderNumber}</td>
                                        <td className="p-3 border-b border-gray-200 text-center">KH{order.customerId}</td>
                                        <td className="p-3 border-b border-gray-200 text-center">
                                            {new Date(order.orderDate).toLocaleString("vi-VN", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="p-3 border-b border-gray-200 text-center">
                                            {Number(order.totalAmount).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                        </td>

                                        <td className="text-center border-b border-gray-200 relative group status-dropdown">
                                            <button
                                                onClick={(e) => {
                                                    if (allowedTransitions[order.statusName]?.length > 0) {
                                                        setEditingOrderId(order.id);
                                                        if (allowedTransitions[order.statusName]?.length > 0) {
                                                            setEditingOrderId(order.id);
                                                            const dropdownHeight = 0;
                                                            const dropdownWidth = 0;
                                                            let top = e.clientY;
                                                            let left = e.clientX;

                                                            if (top + dropdownHeight > window.innerHeight) top -= dropdownHeight;

                                                            if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 10;

                                                            setDropdownPos({ top, left });
                                                        }
                                                    }
                                                }}
                                                className={`px-3 py-1 rounded-full text-sm font-semibold transition
                                            ${statusBgColor(order.statusName)}
                                            ${allowedTransitions[order.statusName]?.length > 0 ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}
                                            `}
                                            >
                                                {statusLabel(order.statusName)}
                                            </button>

                                            {editingOrderId === order.id && allowedTransitions[order.statusName]?.length > 0 &&
                                                createPortal(
                                                    <div
                                                        className="absolute z-50 bg-white border border-gray-200 shadow-lg text-left w-max rounded-lg overflow-hidden"
                                                        style={{
                                                            top: dropdownPos.top,
                                                            left: dropdownPos.left,
                                                            position: "fixed"
                                                        }}
                                                    // onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]
                                                            .filter(status => allowedTransitions[order.statusName].includes(status) || status === order.statusName)
                                                            .map(status => {
                                                                const isActive = order.statusName === status;
                                                                const statusColor = {
                                                                    PENDING: "text-yellow-600",
                                                                    CONFIRMED: "text-blue-600",
                                                                    PROCESSING: "text-orange-600",
                                                                    SHIPPED: "text-purple-600",
                                                                    DELIVERED: "text-green-600",
                                                                    CANCELLED: "text-rose-600",
                                                                    RETURNED: "text-gray-600",
                                                                }[status] || "text-gray-700";

                                                                return (
                                                                    <div
                                                                        key={status}
                                                                        className={`px-4 py-2 cursor-pointer transition-colors ${statusColor} ${isActive ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"}`}
                                                                        onClick={() => {
                                                                            if (!isActive) {
                                                                                setConfirmStatusPanel({
                                                                                    visible: true,
                                                                                    orderId: order.id,
                                                                                    statusName: status,
                                                                                    orderNumber: order.orderNumber
                                                                                });
                                                                            }
                                                                        }}
                                                                    >
                                                                        {statusLabel(status)}
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>,
                                                    document.body
                                                )
                                            }
                                        </td>

                                        <td className="text-center border-b border-gray-200">
                                            {order.paymentMethod === "VNPAY" ? (
                                                <span className={`px-3 py-1 rounded-full text-sm text-white font-semibold ${getPaymentStatusClass(order.paymentStatus)}`}>
                                                    {getPaymentStatusLabel(order.paymentStatus)}
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 border rounded-full text-sm bg-gray-50 font-semibold text-gray-800">
                                                    COD
                                                </span>
                                            )}
                                        </td>

                                        {/* Details */}
                                        <td className="text-center border-b border-gray-200">
                                            <button
                                                onClick={() => handleGetOrderDetails(order.orderNumber)}
                                                className="p-2 text-blue-500 rounded hover:bg-blue-100 transition"
                                            >
                                                <FiEye></FiEye>
                                            </button>
                                        </td>
                                    </tr>

                                ))
                            ))}
                        </tbody>
                    </table>

                </div>
                {isDetailOpen && orderDetails && (
                    <div onClick={() => setIsDetailOpen(false)}
                        className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex justify-center items-center pb-30 z-50">
                        <div onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl shadow-xl w-[95%] max-w-4xl p-8 overflow-hidden max-h-[90vh] relative">

                            {/* Close Button */}
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-2xl hover:cursor-pointer"
                                onClick={() => setIsDetailOpen(false)}
                            >
                                &times;
                            </button>

                            {/* Header: Order Number + Status + Payment */}
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4 mb-4">
                                <div className="flex flex-col justify-between gap-2">
                                    <span className="text-xl font-semibold text-gray-800">{orderDetails.orderNumber}</span>

                                    {/* Status */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-600">Trạng thái:</span>
                                            <span className={`px-3 py-1 rounded-full font-semibold ${statusBgColor(orderDetails.statusName)}`}>
                                                {statusLabel(orderDetails.statusName)}
                                            </span>
                                        </div>

                                        {/* Method + Payment Status */}
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-600">Thanh toán:</span>
                                            <span className="font-semibold text-gray-800">
                                                {orderDetails.paymentMethod === "COD"
                                                    ? "Thanh toán khi nhận hàng"
                                                    : orderDetails.paymentMethod}
                                            </span>

                                            {orderDetails.paymentMethod === "VNPAY" && (
                                                <span
                                                    className={`px-3 py-1 text-white rounded-full font-semibold ${getPaymentStatusClass(orderDetails.paymentStatus)}`}
                                                >
                                                    {getPaymentStatusLabel(orderDetails.paymentStatus)}
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                </div>


                                <div className="text-gray-600 text-sm pt-2 ">
                                    <p className="font-bold">Mã khách hàng: KH{orderDetails.customerId}</p>
                                    {orderDetails.createdAt && <p>Ngày tạo: {new Date(orderDetails.createdAt).toLocaleString("vi-VN")}</p>}
                                    {orderDetails.updatedAt && <p>Ngày cập nhật: {new Date(orderDetails.updatedAt).toLocaleString("vi-VN")}</p>}
                                    {orderDetails.cancelledDate && <p>Ngày hủy: {new Date(orderDetails.cancelledDate).toLocaleString("vi-VN")}</p>}
                                </div>
                            </div>


                            {/* Items List */}
                            <div className="overflow-y-auto max-h-[40vh] flex flex-col gap-3 mb-4">
                                {orderDetails.items.map(item => (
                                    <div key={item.id} className="flex items-center bg-gray-100 p-3 rounded-lg">
                                        <img
                                            src={item.imageUrl}
                                            alt={item.variantName}
                                            className="w-20 h-20 object-cover rounded-md mr-4"
                                        />
                                        <div className="flex flex-1 justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800 line-clamp-1">{item.variantName}</p>
                                                <p className="text-xs text-gray-500">{item.variantSku}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-gray-600 text-sm">x{item.quantity}</p>
                                                <div className="text-gray-800 font-semibold">{item.totalPrice.toLocaleString()}₫</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Main Panel: Address Left, Price Right */}
                            <div className="flex flex-col md:flex-row gap-4 mb-4 px-2">
                                {/* Address */}
                                <div className="flex-1 flex flex-col gap-1 text-gray-700">
                                    <div className="flex gap-3 items-center">
                                        <FiUser className="text-xl flex-shrink-0" />
                                        <p className="text-gray-700 font-semibold text-black">{orderDetails.shippingName}</p>
                                    </div>

                                    <div className="flex gap-3 items-center">
                                        <FiMapPin className="text-xl flex-shrink-0" />
                                        <p className="text-gray-700 line-clamp-1" title={` ${orderDetails.shippingAddress || "-"}`}>
                                            {orderDetails.shippingAddress || "-"}
                                        </p>
                                    </div>

                                    <div className="flex gap-3 items-center">
                                        <FiPhone className="text-xl flex-shrink-0" />
                                        <p className="text-gray-700">{orderDetails.shippingPhone || "-"}</p>
                                    </div>
                                </div>

                                {/* Price Summary */}
                                <div className="flex-1 flex justify-end">
                                    <div className="grid grid-cols-[auto_1fr] gap-x-2 w-55 text-right items-center">
                                        <span className="text-gray-600">Tạm tính:</span>
                                        <span className="text-gray-800 font-semibold">{orderDetails.subtotal.toLocaleString()}₫</span>

                                        {orderDetails.fee > 0 && (
                                            <>
                                                <span className="text-gray-600">Phí vận chuyển:</span>
                                                <span className="text-gray-800 font-semibold">{orderDetails.fee.toLocaleString()}₫</span>
                                            </>
                                        )}
                                        {orderDetails.discountAmount > 0 && (
                                            <>
                                                <span className="text-red-500">Giảm giá:</span>
                                                <span className="text-red-500 font-semibold">{orderDetails.discountAmount.toLocaleString()}₫</span>
                                            </>
                                        )}
                                        <span className="font-semibold text-gray-800">Tổng:</span>
                                        <span className="font-semibold text-red-500 text-lg">{orderDetails.totalAmount.toLocaleString()}₫</span>
                                        {orderDetails.revenue !== null && orderDetails.revenue > 0 && (
                                            <>
                                                <span className="font-semibold text-gray-800">Lợi nhuận:</span>
                                                <span className="font-semibold text-green-500 text-lg">
                                                    {Math.round(orderDetails.revenue).toLocaleString("vi-VN")}₫
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {orderDetails.notes && (
                                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-gray-700 whitespace-pre-wrap">
                                    <span className="font-semibold">Ghi chú:</span>
                                    <p>{orderDetails.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* Pagination */}
                {totalPages > 0 && (
                    <div className="flex justify-center items-center gap-3 mt-10">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
                            disabled={currentPage === 0}
                            className={`p-3 rounded ${currentPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200 transition"}`}
                        >
                            <FaChevronLeft />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i).map(num => (
                            <button
                                key={num}
                                onClick={() => setCurrentPage(num)}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${currentPage === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                            >
                                {num + 1}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))}
                            disabled={currentPage + 1 === totalPages}
                            className={`p-3 rounded ${currentPage + 1 === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200 transition"}`}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}

                {confirmPanel.visible && (
                    <ConfirmPanel
                        visible={confirmPanel.visible}
                        message={confirmPanel.message}
                        onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); closeConfirmPanel(); }}
                        onCancel={closeConfirmPanel}
                    />
                )}
                {confirmStatusPanel.visible && (
                    <div
                        className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                        onClick={() => {
                            setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });
                            setConfirmNotes("");
                        }}
                    >
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-xl pointer-events-auto">
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
                        <div
                            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button

                                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 font-bold text-2xl"
                                onClick={() => {
                                    setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });
                                    setConfirmNotes("");
                                }}
                            >
                                &times;
                            </button>

                            <h3 className="text-xl font-semibold mb-4">
                                Xác nhận đổi trạng thái
                            </h3>
                            <p className="mb-4">
                                Đơn hàng <span className="font-semibold">{confirmStatusPanel.orderNumber}</span> sẽ được chuyển sang trạng thái{" "}
                                <span className={`font-semibold ${statusColor(confirmStatusPanel.statusName)}`}>
                                    {statusLabel(confirmStatusPanel.statusName)}
                                </span>.
                            </p>
                            <textarea

                                placeholder="Ghi chú (tùy chọn)..."
                                value={confirmNotes}
                                onChange={(e) => setConfirmNotes(e.target.value)}
                                className="w-full border rounded p-3 mb-4 focus:outline-none focus:ring-1 focus:ring-gray-700"
                                rows={3}
                            />
                            <div className="flex justify-end gap-2">
                                <button

                                    className={`px-4 py-2 rounded border hover:bg-gray-100 ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                                    onClick={() => {
                                        setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });
                                        setConfirmNotes("");
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    className={`flex items-center gap-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                                    onClick={async () => {
                                        try {
                                            setIsProcessing(true);
                                            const { orderId, statusName } = confirmStatusPanel;

                                            let statusId;
                                            switch (statusName) {
                                                case "PENDING": statusId = 1; break;
                                                case "CONFIRMED": statusId = 2; break;
                                                case "PROCESSING": statusId = 3; break;
                                                case "SHIPPED": statusId = 4; break;
                                                case "DELIVERED": statusId = 5; break;
                                                case "CANCELLED": statusId = 6; break;
                                                case "RETURNED": statusId = 7; break;
                                                default: statusId = 1;
                                            }
                                            const res = await updateOrderStatus(orderId, statusId, confirmNotes);
                                            if (res.error) return showPopup(res.error);

                                            showPopup("Cập nhật trạng thái thành công!");
                                            setConfirmNotes("");
                                            setOrders(prev =>
                                                prev.map(order =>
                                                    order.id === orderId
                                                        ? { ...order, statusName: confirmStatusPanel.statusName }
                                                        : order
                                                )
                                            );
                                            setEditingOrderId(null);
                                        }
                                        finally {
                                            setIsProcessing(false);
                                            setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });
                                        }

                                    }}
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "error" })} duration={3000} />
            </div></>
    );
}

export default AdminOrder;
