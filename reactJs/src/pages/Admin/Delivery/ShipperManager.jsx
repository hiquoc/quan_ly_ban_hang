import { useContext, useEffect, useState } from "react";
import AddShipperForm from "./AddShipperForm";
import { PopupContext } from "../../../contexts/PopupContext";
import { deleteAccount, getAllAccounts } from "../../../apis/authApi";
import { FiCreditCard, FiEye, FiImage, FiLock, FiMapPin, FiPackage, FiPhone, FiRefreshCcw, FiTrash2, FiUnlock, FiUser, FiX } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getAllWarehouses } from "../../../apis/inventoryApi";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { changeShipperActive, changeShipperWarehouse, getAllShippers, getShipperDeliveries } from "../../../apis/deliveryApi";
export default function ShipperManager() {
    const [showAccountForm, setShowAccountForm] = useState(false)
    const { showPopup } = useContext(PopupContext)
    const [shippers, setShippers] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [keyword, setKeyword] = useState("")
    const [statusSort, setStatusSort] = useState(null)
    const [activeSort, setActiveSort] = useState(true)
    const [warehouseSort, setWarehouseSort] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null })
    const [showDeliveriesPanel, setShowDeliveriesPanel] = useState({ visible: false, shipperId: null })
    const [deliveriesPage, setDeliveriesPage] = useState(0)
    const [totalDeliveriesPages, setTotalDeliveriesPages] = useState(0)
    const [deliveries, setDeliveries] = useState([])
    const [deliveriesLoading, setDeliveriesLoading] = useState(false)
    const [deliveriesKeyword, setDeliveriesKeyword] = useState("")
    const [deliveriesStatusFilter, setDeliveriesStatusFilter] = useState("")
    const [showDeliveryDetails, setShowDeliveryDetails] = useState({ delivery: null, visible: true })
    const [showImageModal, setShowImageModal] = useState(false)
    const [warehouseMap, setWarehouseMap] = useState({})

    useEffect(() => {
        handleLoadWarehouses();
    }, [])
    useEffect(() => {
        handleLoadShippers(0);
    }, [statusSort, warehouseSort, activeSort])

    useEffect(() => {
        if (showDeliveriesPanel.shipperId === null) {
            return;
        }
        handleGetShipperDeliveries(0);
    }, [showDeliveriesPanel.shipperId, deliveriesStatusFilter])
    async function handleLoadShippers(currentPage = 0) {
        try {
            setIsLoading(true)
            setPage(currentPage)
            const res = await getAllShippers(currentPage, 10, keyword, statusSort, warehouseSort, activeSort)
            if (res.error)
                return showPopup(res.error)
            setShippers(res.data.content || [])
            setPage(currentPage)
            setTotalPages(res.data.totalPages)
        }
        finally {
            setIsLoading(false)
        }
    }
    async function handleLoadWarehouses() {
        const res = await getAllWarehouses();
        if (res.error) return showPopup(res.error);
        const data = res.data;
        setWarehouses(data);
        setWarehouseMap(Object.fromEntries(data.map(w => [w.id, w.code])));
    }
    async function handleChangeShipperWarehouse(id, warehouseId) {
        const selectedWarehouse = warehouses.find(w => w.id === Number(warehouseId));
        setConfirmPanel({
            visible: true, message: `Thay đổi kho hoạt động của SP${id} thành ${selectedWarehouse.name}?`, onConfirm: async () => {
                const res = await changeShipperWarehouse(id, warehouseId);
                if (res.error) return showPopup(res.error);
                setShippers(prev => prev.map(s => s.id === id ? { ...s, warehouseId: warehouseId } : s));
                handleOnCloseConfirmPanel();
            }
        });
    }
    function handleOnCloseConfirmPanel() {
        setConfirmPanel({ visible: false, message: '', onConfirm: null })
    }
    const handleToggleActive = async (id, isActive) => {
        setConfirmPanel({
            visible: true, message: `${isActive ? "Khóa" : "Mở khóa"} tài khoản của SP${id}?`, onConfirm: async () => {
                const res = await changeShipperActive(id);
                if (res.error) return showPopup(res.error);
                setShippers(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
                handleOnCloseConfirmPanel();
            }
        });
    };
    const handleShowShipperDeliveries = (id) => {
        setShowDeliveriesPanel({ visible: true, shipperId: id })
        setDeliveriesKeyword("")
        setDeliveriesStatusFilter("")
        setDeliveriesPage(0)
    }
    const handleCloseDeliveriesPanel = () => {
        setShowDeliveriesPanel({ visible: false, shipperId: null })
        setDeliveriesKeyword("")
        setDeliveriesStatusFilter("")
        setDeliveriesPage(0)
        setDeliveries([])
    }
    const handleGetShipperDeliveries = async (currentPage = 0) => {
        try {
            setDeliveriesLoading(true)
            setDeliveriesPage(currentPage)
            const res = await getShipperDeliveries(currentPage, 10, deliveriesKeyword, deliveriesStatusFilter, showDeliveriesPanel.shipperId)
            if (res.error)
                return showPopup(res.error)
            console.log(res.data.content)
            setDeliveries(res.data.content || [])
            setDeliveriesPage(currentPage)
            setTotalDeliveriesPages(res.data.totalPages || 0)
        }
        finally {
            setDeliveriesLoading(false)
        }
    }
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 4;
        if (totalPages <= maxVisible + 2) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 2) {
                pages.push(0, 1, 2, 3, "...", totalPages - 1);
            } else if (page >= totalPages - 3) {
                pages.push(0, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
            } else {
                pages.push(0, "...", page - 1, page, page + 1, "...", totalPages - 1);
            }
        }
        return pages;
    };
    const getDeliveriesPageNumbers = () => {
        const pages = [];
        const maxVisible = 4;
        if (totalDeliveriesPages <= maxVisible + 2) {
            for (let i = 0; i < totalDeliveriesPages; i++) {
                pages.push(i);
            }
        } else {
            if (deliveriesPage <= 2) {
                pages.push(0, 1, 2, 3, "...", totalDeliveriesPages - 1);
            } else if (deliveriesPage >= totalDeliveriesPages - 3) {
                pages.push(0, "...", totalDeliveriesPages - 4, totalDeliveriesPages - 3, totalDeliveriesPages - 2, totalDeliveriesPages - 1);
            } else {
                pages.push(0, "...", deliveriesPage - 1, deliveriesPage, deliveriesPage + 1, "...", totalDeliveriesPages - 1);
            }
        }
        return pages;
    };
    const shipperStatusVN = {
        OFFLINE: "Ngoại tuyến",
        SHIPPING: "Đang giao hàng",
        ONLINE: "Đang trực tuyến"
    }
    const shipperStatusStyle = {
        OFFLINE: "px-3 py-1 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 transition hover:bg-gray-300",
        ONLINE: "px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white transition hover:bg-green-400",
        SHIPPING: "px-3 py-1 rounded-full text-sm font-semibold bg-blue-500 text-white transition hover:bg-blue-400",
    };
    const deliveryStatusVN = {
        PENDING: "Chờ xử lý",
        ASSIGNED: "Đã phân công",
        SHIPPING: "Đang giao",
        DELIVERED: "Đã giao thành công",
        FAILED: "Thất bại",
        CANCELLED: "Đã hủy"
    }
    const deliveryStatusStyle = {
        PENDING: "px-3 py-1 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 transition hover:bg-gray-300",
        ASSIGNED: "px-3 py-1 rounded-full text-sm font-semibold bg-yellow-500 text-white transition hover:bg-yellow-400",
        SHIPPING: "px-3 py-1 rounded-full text-sm font-semibold bg-blue-500 text-white transition hover:bg-blue-400",
        DELIVERED: "px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white transition hover:bg-green-400",
        FAILED: "px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white transition hover:bg-red-400",
        CANCELLED: "px-3 py-1 rounded-full text-sm font-semibold bg-gray-500 text-white transition hover:bg-gray-400",
    };

    return (<div className="p-6 bg-white rounded shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-gray-800">Quản lý shipper</h2>
            <button
                onClick={() => setShowAccountForm(true)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 hover:cursor-pointer"
            >
                Tạo tài khoản
            </button>
        </div>
        <div className="flex justify-between">
            <div className="flex gap-1">
                <input
                    type="text"
                    placeholder="Từ khóa..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700"
                />
                <button
                    onClick={() => {
                        handleLoadShippers(0);
                    }}
                    className="px-5 py-2 text-white bg-black rounded hover:bg-gray-800 hover:cursor-pointer"
                >
                    Tìm
                </button>
            </div>
            <div className="flex gap-2">
                <select value={statusSort || ""} onChange={e => setStatusSort(e.target.value)} className="p-2 border border-gray-700 rounded hover:cursor-pointer">
                    <option value="">Tất cả trạng thái</option>
                    <option value="ONLINE">Đang trực tuyến</option>
                    <option value="OFFLINE">Đang ngoại tuyến</option>
                    <option value="SHIPPING">Đang giao hàng</option>
                </select>
                <select
                    value={warehouseSort}
                    onChange={e => setWarehouseSort(e.target.value)}
                    className="p-2 border border-gray-700 rounded hover:cursor-pointer"
                >
                    <option value="">Tất cả kho</option>
                    {warehouses?.map(w =>
                        <option key={w.id} value={w.id}>
                            {w.name}
                        </option>
                    )}
                </select>
                <select
                    value={activeSort || true}
                    onChange={e => setActiveSort(e.target.value === "" ? "" : e.target.value)}
                    className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer"
                >
                    <option value="">Tất cả tài khoản</option>
                    <option value={true}>Đang hoạt động</option>
                    <option value={false}>Đã bị khóa</option>
                </select>
                <button onClick={() => handleLoadShippers()} className="flex items-center px-4 py-2 border border-gray-700 rounded hover:bg-gray-200 hover:cursor-pointer">
                    <FiRefreshCcw className="h-5 w-5 mr-2" /> Làm mới
                </button>
            </div>
        </div>
        {/* Table */}
        <div className="mt-8 bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                <thead className="bg-gray-200 text-gray-700">
                    <tr>
                        {["Mã Shipper", "Họ và tên", "Email", "SĐT", "Trạng thái", "Kho làm việc", "Hành động"].map(head => (
                            <th key={head} className="p-3 border-b border-gray-200 text-center">{head}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {isLoading ? (
                        <tr>
                            <td colSpan={9} className="p-4 text-gray-500 text-center align-middle">
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
                    ) : (shippers.length === 0 ? (
                        <tr className="hover:bg-gray-50 transition">
                            <td colSpan={6} className="text-center p-3">
                                Không có kết quả
                            </td>
                        </tr>
                    ) : (shippers.map(shipper => (
                        <tr key={shipper.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 border-b border-gray-200 text-center">{`SP${shipper.id}`}</td>
                            <td className="p-3 border-b border-gray-200 text-center">{shipper.fullName || "-"}</td>
                            <td className="p-3 border-b border-gray-200 text-center">{shipper.email || "-"}</td>
                            <td className="p-3 border-b border-gray-200 text-center">{shipper.phone || "-"}</td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                <button
                                    className={shipperStatusStyle[shipper.status]} >
                                    {shipperStatusVN[shipper.status]}
                                </button>
                            </td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                <select
                                    className="p-1 border rounded"
                                    onChange={(e) => handleChangeShipperWarehouse(shipper.id, e.target.value)}
                                    value={shipper.warehouseId || 0}>
                                    {warehouses && warehouses.map(w =>
                                        <option key={w.id} value={w.id}>{w.code}</option>
                                    )}
                                </select>
                            </td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                <div className="flex justify-center gap-2 flex-wrap">
                                    <button
                                        className={`p-2 rounded text-sm font-semibold cursor-pointer transition
                                            text-blue-500 hover:bg-blue-100`}
                                        onClick={() => handleShowShipperDeliveries(shipper.id)}
                                    >
                                        <FiEye />
                                    </button>
                                    <button
                                        className={`p-2 rounded text-sm font-semibold cursor-pointer transition
                                            ${shipper.isActive ? "text-green-500 hover:bg-green-100"
                                                : "text-gray-500  hover:bg-gray-300"
                                            }`}
                                        title={shipper.isActive ? "Khóa" : "Mở khóa"}
                                        aria-label={shipper.isActive ? "Khóa" : "Mở khóa"}
                                        onClick={() =>
                                            handleToggleActive(shipper.id, shipper.isActive)
                                        }
                                    >
                                        {!shipper.isActive ? <FiLock /> : <FiUnlock />}
                                        <span className="sr-only">{shipper.isActive ? "Khóa" : "Mở khóa"}</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))))}
                </tbody>
            </table>
        </div>
        {totalPages > 0 && (
            <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                <button
                    onClick={() => handleLoadShippers(Math.max(page - 1, 0))}
                    disabled={page === 0}
                    className={`p-3 rounded ${page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                >
                    <FaChevronLeft />
                </button>
                {getPageNumbers().map((num, i) =>
                    num === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-500">...</span>
                    ) : (
                        <button
                            key={`page-${num}`}
                            onClick={() => handleLoadShippers(num)}
                            className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${page === num
                                ? "bg-black text-white border-black"
                                : "bg-white hover:bg-gray-100"
                                }`}
                        >
                            {num + 1}
                        </button>
                    )
                )}
                <button
                    onClick={() => handleLoadShippers(Math.min(page + 1, totalPages - 1))}
                    disabled={page >= totalPages - 1}
                    className={`p-3 rounded ${page >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                >
                    <FaChevronRight />
                </button>
            </div>
        )}
        {showAccountForm &&
            <AddShipperForm
                warehouses={warehouses}
                onClose={() => setShowAccountForm(false)}
                onSuccess={() => { setShowAccountForm(false); showPopup("Tạo tài khoản thành công!", "success"); handleLoadShippers() }}
                showPopup={showPopup}
            />}
        <ConfirmPanel
            visible={confirmPanel.visible}
            message={confirmPanel.message}
            onConfirm={confirmPanel.onConfirm}
            onCancel={handleOnCloseConfirmPanel}
        ></ConfirmPanel>
        {showDeliveriesPanel.visible && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 pb-10">
                <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-semibold text-gray-800">Lịch sử giao hàng của SP{showDeliveriesPanel.shipperId}</h3>
                            <button
                                onClick={handleCloseDeliveriesPanel}
                                className="text-gray-500 hover:text-gray-700 transition"
                            >
                                <FiX className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex justify-between mb-6">
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    placeholder="Từ khóa..."
                                    value={deliveriesKeyword}
                                    onChange={e => setDeliveriesKeyword(e.target.value)}
                                    className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700"
                                />
                                <button
                                    onClick={() => {
                                        handleGetShipperDeliveries(0);
                                    }}
                                    className="px-5 py-2 text-white bg-black rounded hover:bg-gray-800 hover:cursor-pointer"
                                >
                                    Tìm
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={deliveriesStatusFilter || ""}
                                    onChange={e => {
                                        setDeliveriesStatusFilter(e.target.value);
                                    }}
                                    className="p-2 border border-gray-700 rounded hover:cursor-pointer"
                                >
                                    <option value="">Tất cả trạng thái</option>
                                    <option value="PENDING">Chờ xử lý</option>
                                    <option value="ASSIGNED">Đã phân công</option>
                                    <option value="SHIPPING">Đang giao</option>
                                    <option value="DELIVERED">Đã giao thành công</option>
                                    <option value="FAILED">Thất bại</option>
                                    <option value="CANCELLED">Đã hủy</option>
                                </select>
                                <button
                                    onClick={() => handleGetShipperDeliveries(0)}
                                    className="flex items-center px-4 py-2 border border-gray-700 rounded hover:bg-gray-200 hover:cursor-pointer"
                                >
                                    <FiRefreshCcw className="h-5 w-5 mr-2" /> Làm mới
                                </button>
                            </div>
                        </div>
                        {/* Deliveries Table */}
                        <div className="bg-white rounded-xl shadow overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                                <thead className="bg-gray-200 text-gray-700">
                                    <tr>
                                        {["Mã đơn hàng", "Trạng thái", "Khách hàng", "Số điện thoại", "Ngày giao", "Chi tiết"].map(head => (
                                            <th key={head} className="p-3 border-b border-gray-200 text-center">{head}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {deliveriesLoading ? (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-gray-500 text-center align-middle">
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
                                                            d="M4 12a8 8 0 018-8V8a4 4 0 00-4 4H4z"
                                                        ></path>
                                                    </svg>
                                                    Đang tải dữ liệu giao hàng...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (deliveries.length === 0 ? (
                                        <tr className="hover:bg-gray-50 transition">
                                            <td colSpan={6} className="text-center p-3">
                                                Không có kết quả giao hàng
                                            </td>
                                        </tr>
                                    ) : (deliveries.map(delivery => (
                                        <tr key={delivery.id} className="hover:bg-gray-50 transition">
                                            <td className="p-3 border-b border-gray-200 text-center">{delivery.deliveryNumber || "-"}</td>
                                            <td className="p-3 border-b border-gray-200 text-center">
                                                <span className={deliveryStatusStyle[delivery.status]}>
                                                    {deliveryStatusVN[delivery.status]}
                                                </span>
                                            </td>
                                            <td className="p-3 border-b border-gray-200 text-center">{delivery.shippingName || "-"}</td>
                                            <td className="p-3 border-b border-gray-200 text-center">{delivery.shippingPhone || "-"}</td>
                                            <td className="p-3 border-b border-gray-200 text-center">
                                                {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleDateString('vi-VN') : "-"}
                                            </td>
                                            <td className="p-3 border-b border-gray-200 text-center">
                                                <button
                                                    className={`p-2 rounded text-sm font-semibold cursor-pointer transition
                                                        text-blue-500 hover:bg-blue-100`}
                                                    onClick={() => setShowDeliveryDetails({ delivery: delivery, visible: true })}
                                                >
                                                    <FiEye />
                                                </button>
                                            </td>
                                        </tr>
                                    ))))}
                                </tbody>
                            </table>
                        </div>
                        {totalDeliveriesPages > 0 && (
                            <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                                <button
                                    onClick={() => handleGetShipperDeliveries(Math.max(deliveriesPage - 1, 0))}
                                    disabled={deliveriesPage === 0}
                                    className={`p-3 rounded ${deliveriesPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                                >
                                    <FaChevronLeft />
                                </button>
                                {getDeliveriesPageNumbers().map((num, i) =>
                                    num === "..." ? (
                                        <span key={`ellipsis-${i}`} className="px-2 text-gray-500">...</span>
                                    ) : (
                                        <button
                                            key={`page-${num}`}
                                            onClick={() => handleGetShipperDeliveries(num)}
                                            className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${deliveriesPage === num
                                                ? "bg-black text-white border-black"
                                                : "bg-white hover:bg-gray-100"
                                                }`}
                                        >
                                            {num + 1}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => handleGetShipperDeliveries(Math.min(deliveriesPage + 1, totalDeliveriesPages - 1))}
                                    disabled={deliveriesPage >= totalDeliveriesPages - 1}
                                    className={`p-3 rounded ${deliveriesPage >= totalDeliveriesPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}

                        {showDeliveryDetails.visible && showDeliveryDetails.delivery && (
                            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                    {/* Header */}
                                    <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-gray-800">Chi tiết giao hàng</h2>
                                        <button
                                            onClick={() => setShowDeliveryDetails({ delivery: null, visible: false })}
                                            className="p-1.5 hover:bg-gray-100 rounded transition"
                                        >
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {/* Content */}
                                    <div className="p-4 space-y-3">
                                        {/* Main Delivery Card */}
                                        <div className={`border rounded-lg p-3  border-gray-200`}>
                                            <div className="flex flex-col gap-1">
                                                {/* Header */}
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-gray-800">{showDeliveryDetails.delivery.deliveryNumber}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${showDeliveryDetails.delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                                showDeliveryDetails.delivery.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                                                                    showDeliveryDetails.delivery.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-700' :
                                                                        showDeliveryDetails.delivery.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                                            showDeliveryDetails.delivery.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {deliveryStatusVN[showDeliveryDetails.delivery.status]}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-700">Đơn: {showDeliveryDetails.delivery.orderNumber}</div>
                                                    </div>
                                                </div>
                                                {/* Failed Reason */}
                                                {showDeliveryDetails.delivery.failedReason && (
                                                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                                                        <span className="font-semibold">Lý do thất bại:</span> {showDeliveryDetails.delivery.failedReason}
                                                    </div>
                                                )}
                                                {/* Item List */}
                                                {showDeliveryDetails.delivery.itemList && showDeliveryDetails.delivery.itemList.length > 0 && (
                                                    <div className="mt-2 p-2 border-t border-gray-300">
                                                        <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                                                            {showDeliveryDetails.delivery.itemList.map((item) => (
                                                                <div key={item.id} className="flex gap-2">
                                                                    {item.imageUrl ? (
                                                                        <img
                                                                            src={item.imageUrl}
                                                                            alt={item.variantName}
                                                                            className="w-14 h-14 object-cover rounded flex-shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-14 h-14 bg-gray-300 rounded flex items-center justify-center flex-shrink-0">
                                                                            <FiPackage className="text-gray-500" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium text-gray-800 line-clamp-2">
                                                                            {item.variantName}
                                                                        </div>
                                                                        {item.sku && (
                                                                            <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                                                        )}
                                                                        <div className="flex justify-between items-center">
                                                                            <span className="text-xs text-gray-600">
                                                                                Số lượng: {item.quantity}
                                                                            </span>
                                                                            <span className="text-sm font-semibold text-gray-800">
                                                                                {Number(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Shipping Details */}
                                                <div className="text-sm text-gray-700 mt-2 pt-2 border-t border-gray-300">
                                                    <div className="flex items-center gap-2">
                                                        <FiUser className="flex-shrink-0" />
                                                        <span>{showDeliveryDetails.delivery.shippingName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <FiMapPin className="flex-shrink-0" />
                                                        <span className="line-clamp-2">{showDeliveryDetails.delivery.shippingAddress}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FiPhone className="flex-shrink-0" />
                                                            <span className="font-semibold">{showDeliveryDetails.delivery.shippingPhone}</span>
                                                        </div>
                                                        <span className="text-base font-semibold text-red-600">
                                                            {Number(showDeliveryDetails.delivery.codAmount).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Timeline & Warehouse */}
                                        <div className="border rounded-lg p-3 bg-white">
                                            <div>
                                                <h3 className="font-semibold text-gray-800 ">Lịch sử giao hàng</h3>
                                                <div className="flex justify-between">
                                                    <div className="text-sm text-gray-700 p-1 space-y-0.5">
                                                        <div>
                                                            <span className="text-gray-600">Ngày tạo: </span>
                                                            <span className="font-medium">
                                                                {new Date(showDeliveryDetails.delivery.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} {new Date(showDeliveryDetails.delivery.createdAt).toLocaleDateString('vi-VN')}
                                                            </span>
                                                        </div>
                                                        {showDeliveryDetails.delivery.assignedAt && (
                                                            <div>
                                                                <span className="text-gray-600">Ngày phân công: </span>
                                                                <span className="font-medium">
                                                                    {new Date(showDeliveryDetails.delivery.assignedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} {new Date(showDeliveryDetails.delivery.assignedAt).toLocaleDateString('vi-VN')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {showDeliveryDetails.delivery.deliveredAt && (
                                                            <div>
                                                                <span className="text-gray-600">Ngày giao: </span>
                                                                <span className="font-medium text-green-700">
                                                                    {new Date(showDeliveryDetails.delivery.deliveredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} {new Date(showDeliveryDetails.delivery.deliveredAt).toLocaleDateString('vi-VN')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-gray-600">Ngày cập nhật: </span>
                                                            <span className="font-medium">
                                                                {new Date(showDeliveryDetails.delivery.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} {new Date(showDeliveryDetails.delivery.updatedAt).toLocaleDateString('vi-VN')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {showDeliveryDetails.delivery.status === 'DELIVERED' && showDeliveryDetails.delivery.imageUrl && (
                                                            <img
                                                                src={showDeliveryDetails.delivery.imageUrl}
                                                                alt="Thumbnail giao hàng"
                                                                className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                                                onClick={() => setShowImageModal(true)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="p-1 border-t border-gray-200 mt-2 text-sm">
                                                    <div className="">
                                                        <span className="text-gray-600">Kho: </span>
                                                        <span className="font-medium">{warehouseMap[showDeliveryDetails.delivery.warehouseId]}</span>
                                                    </div>
                                                    <div className="">
                                                        <span className="text-gray-600">Shipper: </span>
                                                        <span className="font-medium">SP{showDeliveryDetails.delivery.assignedShipperId}</span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                                {/* Image Modal */}
                                {showImageModal && showDeliveryDetails.delivery?.imageUrl && (
                                    <div
                                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
                                        onClick={() => setShowImageModal(false)}
                                    >
                                        <button
                                            onClick={() => setShowImageModal(false)}
                                            className="p-2 hover:bg-white/20 text-white rounded-full transition absolute top-4 right-4"
                                        >
                                            <FiX className="w-6 h-6" />
                                        </button>

                                        {/* Modal Content */}
                                        <div
                                            className="rounded-lg shadow-xl max-w-[90%] max-h-[90%] overflow-hidden relative"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <img
                                                src={showDeliveryDetails.delivery.imageUrl}
                                                alt="Chứng nhận giao hàng"
                                                className="max-w-full max-h-full object-contain rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>)
}
