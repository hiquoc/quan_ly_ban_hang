import { FiEye, FiRefreshCcw, FiChevronDown, FiChevronUp } from "react-icons/fi"
import { PopupContext } from "../../../contexts/PopupContext"
import { useState, useEffect, useContext } from "react"
import { assignDeliveriesToShipper, getAllDeliveries, getAllShippers, getAllShippersDetails, getShipperDetails } from "../../../apis/deliveryApi"
import { FiUser, FiMapPin, FiPhone } from 'react-icons/fi';
import { getAllWarehouses } from "../../../apis/inventoryApi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

export default function DeliveryManager() {
    const { showPopup } = useContext(PopupContext)
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingShipperDeliveries, setIsLoadingShipperDeliveries] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [orders, setOrders] = useState([])
    const [page, setPage] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [warehouses, setWarehouses] = useState([])
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null)
    const [shippers, setShippers] = useState([])
    const [selectedOrders, setSelectedOrders] = useState([])
    const [assignmentSelect, setAssignmentSelect] = useState({ visible: false, selectedOrdersData: null })
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [deliveryDetails, setDeliveryDetails] = useState(null)
    const [expandedShipperId, setExpandedShipperId] = useState(null)
    const [keyword, setKeyword] = useState("")
    const [statusSort, setStatusSort] = useState("PENDING")

    useEffect(() => { handleLoadWarehouses(); }, [])
    useEffect(() => {
        if (warehouses.length === 0) return;
        handleLoadDeliveryOrders(0);
        setSelectedOrders([])
    }, [selectedWarehouseId, statusSort])


    async function handleLoadWarehouses() {
        const res = await getAllWarehouses();
        if (res.error) return showPopup(res.error)
        setWarehouses(res.data)
        setSelectedWarehouseId(res.data[0].id)
    }

    async function handleLoadDeliveryOrders(currentPage = page) {
        setIsLoading(true)
        setPage(currentPage)
        try {
            const res = await getAllDeliveries(currentPage, 20, keyword, statusSort, selectedWarehouseId);
            if (res.error) return showPopup(res.error)
            setOrders(res.data.content)
            setTotalPages(res.data.totalPages)
        } finally { setIsLoading(false) }
    }

    async function handleLoadShipperDetails(shipperId) {
        setIsLoadingShipperDeliveries(true)
        try {
            const res = await getShipperDetails(shipperId);
            if (res.error) return showPopup(res.error)
            setShippers(prev => prev.map(warehouseObj =>
                warehouseObj.warehouseId === selectedWarehouseId
                    ? { ...warehouseObj, shippersList: warehouseObj.shippersList.map(s => s.id === shipperId ? { ...s, ...res.data, detailsLoaded: true } : s) }
                    : warehouseObj
            ))
        } finally { setIsLoadingShipperDeliveries(false) }
    }

    const toggleShipperExpand = async (shipperId) => {
        if (expandedShipperId === shipperId) { setExpandedShipperId(null); return }
        setExpandedShipperId(shipperId)
        const warehouseShippers = shippers.find(s => s.warehouseId === selectedWarehouseId)
        const shipper = warehouseShippers?.shippersList?.find(s => s.id === shipperId)
        if (!shipper?.detailsLoaded) await handleLoadShipperDetails(shipperId)
    }

    const toggleOrderSelection = (orderId) => { setSelectedOrders(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]) }
    const toggleSelectAll = () => { selectedOrders.length === orders.length ? setSelectedOrders([]) : setSelectedOrders(orders.map(order => order.id)) }

    const handleBatchAssignment = async () => {
        if (selectedOrders.length === 0) { showPopup("Vui lòng chọn ít nhất một đơn hàng"); return; }
        // if (!shippers.some(s => s.warehouseId === selectedWarehouseId)) {
        const res = await getAllShippersDetails(0, null, null, "ONLINE", selectedWarehouseId, true);
        if (res.error) return showPopup(res.error);
        setShippers(prev => [...prev, { warehouseId: selectedWarehouseId, shippersList: res.data.content }]);
        // }
        setAssignmentSelect({ visible: true, selectedOrdersData: orders.filter(order => selectedOrders.includes(order.id)) });
        setExpandedShipperId(null)
    };

    const handleViewAllShippers = async () => {
        // if (!shippers.some(s => s.warehouseId === selectedWarehouseId)) {
        const res = await getAllShippersDetails(0, null, null, "ONLINE", selectedWarehouseId, true);
        if (res.error) return showPopup(res.error);
        setShippers(prev => [...prev, { warehouseId: selectedWarehouseId, shippersList: res.data.content }]);
        // }
        setAssignmentSelect({ visible: true, selectedOrdersData: [] });
        setExpandedShipperId(null)
    }

    const handleAssignDeliveryOrderToShipper = async (shipperId, deliveryIds) => {
        if (isProcessing) return;
        setIsProcessing(true)
        try {
            const res = await assignDeliveriesToShipper(shipperId, deliveryIds);
            if (res.error) return showPopup(res.error);
            setOrders(prev => prev.map(order => deliveryIds.includes(order.id) ? { ...order, status: "ASSIGNED", assignedShipperId: shipperId } : order));
            const shipperRes = await getAllShippersDetails(0, null, null, "ONLINE", selectedWarehouseId, true);
            if (shipperRes.error) return showPopup(shipperRes.error);
            setShippers(prev => {
                const existingIndex = prev.findIndex(w => w.warehouseId === selectedWarehouseId);
                if (existingIndex !== -1) {
                    const newPrev = [...prev];
                    newPrev[existingIndex] = { warehouseId: selectedWarehouseId, shippersList: shipperRes.data.content };
                    return newPrev;
                } else {
                    return [...prev, { warehouseId: selectedWarehouseId, shippersList: shipperRes.data.content }];
                }
            });
            setSelectedOrders([])
            setAssignmentSelect({ visible: false, selectedOrdersData: null })
            showPopup("Phân công thành công!")
        } finally {
            setIsProcessing(false)
        }
    }

    const statusBgColor = (status) => ({ PENDING: 'bg-yellow-200 text-yellow-800', ASSIGNED: 'bg-indigo-100 text-indigo-800', SHIPPING: 'bg-blue-100 text-blue-800', DELIVERED: 'bg-green-100 text-green-800', FAILED: 'bg-gray-100 text-gray-800', CANCELLED: 'bg-red-100 text-red-800' }[status] || 'bg-gray-100 text-gray-800');
    const statusLabel = (status) => ({ PENDING: 'Chưa phân công', ASSIGNED: 'Đã phân công', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', FAILED: 'Giao thất bại', CANCELLED: 'Đã hủy' }[status] || status);
    const ALLOW_REASSIGN_STATUSES = ["PENDING", "ASSIGNED", "FAILED"];

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

    const renderOrderCard = (order, type) => {
        const isAssigned = type === 'assigned';
        return (
            <div key={order.id} className={`border rounded-lg p-3 ${isAssigned ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">{order.deliveryNumber}</span>
                                {/* <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isAssigned ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{isAssigned ? 'Đã phân công' : 'Sẽ phân công'}</span> */}
                            </div>
                            <div className="text-sm text-gray-700">Đơn: {order.orderNumber}</div>
                        </div>
                        <button className="p-2 text-blue-700 hover:bg-blue-100 rounded transition"
                            onClick={() => { setDeliveryDetails(order); setIsDetailOpen(true) }}><FiEye /></button>
                    </div>
                    <div className="text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                            <FiUser className="flex-shrink-0" /><span>{order.shippingName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <FiMapPin className="flex-shrink-0" /><span className="line-clamp-2">{order.shippingAddress}</span>
                        </div>
                        <div className="flex justify-between">
                            <div className="flex items-center gap-2"><FiPhone className="flex-shrink-0" /><span className="font-semibold">{order.shippingPhone}</span></div>
                            <span className="text-base font-semibold text-red-600">{Number(order.codAmount).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 min-h-screen bg-white rounded shadow">
            <div className="flex justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-semibold text-gray-800">Quản lý giao hàng</h2>
                <button onClick={() => handleLoadDeliveryOrders()} className="flex items-center px-4 py-2 border border-gray-700 rounded hover:bg-gray-200 hover:cursor-pointer"><FiRefreshCcw className="h-5 w-5 mr-2" /> Làm mới</button>
            </div>
            <div className="flex justify-between flex-wrap gap-2">
                <div className="flex gap-1">
                    <input type="text" placeholder="Từ khóa..." value={keyword} onChange={e => setKeyword(e.target.value)} className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700" />
                    <button onClick={() => handleLoadDeliveryOrders(0)} className="px-5 py-2 text-white bg-black rounded hover:bg-gray-800 hover:cursor-pointer">Tìm</button>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <select value={statusSort} onChange={e => setStatusSort(e.target.value)} className="p-2 border border-gray-700 rounded hover:cursor-pointer">
                        <option value="">Tất cả trạng thái</option>
                        <option value="PENDING">Chưa phân công</option>
                        <option value="ASSIGNED">Đã phân công</option>
                        <option value="SHIPPING">Đang giao</option>
                        <option value="DELIVERED">Đã giao</option>
                        <option value="FAILED">Giao thất bại</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                    <select value={selectedWarehouseId || 0} onChange={e => setSelectedWarehouseId(e.target.value)} className="p-2 border border-gray-700 rounded hover:cursor-pointer">
                        {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <button onClick={handleViewAllShippers} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 hover:cursor-pointer">Xem tất cả Shipper</button>
                </div>
            </div>

            {selectedOrders.length > 0 && (
                <div className="mt-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Đã chọn {selectedOrders.length} đơn hàng</span>
                    <div className="flex gap-2">
                        <button onClick={handleBatchAssignment} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition">Phân công</button>
                        <button onClick={() => setSelectedOrders([])} className="px-4 py-2 border bg-white text-gray-800 rounded hover:bg-gray-100 transition">Bỏ chọn tất cả</button>
                    </div>
                </div>
            )}

            <div className="mt-8 bg-white rounded-xl shadow overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                    <thead className="bg-gray-200 text-gray-700">
                        <tr>
                            {/* <th className="p-3 border-b border-gray-200 text-center"><input type="checkbox" checked={orders && selectedOrders.length === orders.length} onChange={toggleSelectAll} className="w-4 h-4 cursor-pointer" /></th> */}
                            <th></th>
                            {["Mã giao hàng", "Mã đơn hàng", "Địa chỉ", "Tiền phải thu", "Trạng thái", "Phân công", "Chi tiết"].map(head => <th key={head} className="p-3 border-b border-gray-200 text-center">{head}</th>)}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {isLoading ? (
                            <tr><td colSpan={8} className="p-4 text-gray-500 text-center align-middle"><div className="inline-flex gap-2 items-center justify-center"><svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Đang tải dữ liệu...</div></td></tr>
                        ) : orders?.length === 0 ? (
                            <tr><td colSpan={8} className="text-center p-3">Không có kết quả</td></tr>
                        ) : orders?.map(order => (
                            <tr key={order.id} className={`hover:bg-gray-50 transition ${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}`}>
                                <td className="p-3 border-b border-gray-200 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.includes(order.id)}
                                        disabled={!ALLOW_REASSIGN_STATUSES.includes(order.status)}
                                        onChange={() => toggleOrderSelection(order.id)}
                                        className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-200"
                                    />
                                </td>
                                <td className="p-3 border-b border-gray-200 text-center">{order.deliveryNumber}</td>
                                <td className="p-3 border-b border-gray-200 text-center">{order.orderNumber}</td>
                                <td className="p-3 border-b border-gray-200 text-center">{order.shippingAddress}</td>
                                <td className="p-3 border-b border-gray-200 text-center">{Number(order.codAmount).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</td>
                                <td className="p-3 border-b border-gray-200 text-center"><span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBgColor(order.status)}`}>{statusLabel(order.status)}</span></td>
                                <td className="p-3 border-b border-gray-200 text-center"><span className={`px-3 py-1 rounded-full text-sm font-semibold ${order.assignedShipperId ? "bg-blue-100 text-blue-800" : "bg-yellow-200 text-yellow-800"}`}>{order.assignedShipperId ? `SP${order.assignedShipperId}` : "Chưa phân công"}</span></td>
                                <td className="p-3 border-b border-gray-200 text-center"><button className="p-2 text-blue-600 hover:bg-blue-100 rounded transition" onClick={() => {  setDeliveryDetails(order); setIsDetailOpen(true) }}><FiEye /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 0 && (
                <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                    <button
                        onClick={() => handleLoadDeliveryOrders(Math.max(page - 1, 0))}
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
                                onClick={() => handleLoadDeliveryOrders(num)}
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
                        onClick={() => handleLoadDeliveryOrders(Math.min(page + 1, totalPages - 1))}
                        disabled={page >= totalPages - 1}
                        className={`p-3 rounded ${page >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailOpen && deliveryDetails && (
                <div onClick={() => setIsDetailOpen(false)} className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex justify-center items-center pb-30 z-51">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-[95%] max-w-4xl p-8 overflow-hidden max-h-[90vh] relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-2xl hover:cursor-pointer" onClick={() => setIsDetailOpen(false)}>&times;</button>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b pb-4 mb-4">
                            <div className="flex flex-col justify-between gap-2">
                                <span className="text-xl font-semibold text-gray-800">{deliveryDetails.deliveryNumber}</span>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2"><span className="font-semibold text-gray-600">Trạng thái:</span><span className={`px-3 py-1 rounded-full font-semibold ${statusBgColor(deliveryDetails.status)}`}>{statusLabel(deliveryDetails.status)}</span></div>
                                    <div className="flex items-center gap-2"><span className="font-semibold text-gray-600">Thanh toán:</span><span className="font-semibold text-gray-800">{deliveryDetails.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : deliveryDetails.paymentMethod}</span></div>
                                </div>
                            </div>
                            <div className="text-gray-600 text-sm pt-2">
                                <p className="font-bold">Mã đơn hàng: {deliveryDetails.orderNumber}</p>
                                {deliveryDetails.createdAt && <p>Ngày tạo: {new Date(deliveryDetails.createdAt).toLocaleString("vi-VN")}</p>}
                                {deliveryDetails.assignedAt && <p>Ngày phân công: {new Date(deliveryDetails.assignedAt).toLocaleString("vi-VN")}</p>}
                                {deliveryDetails.deliveredAt && <p>Ngày giao: {new Date(deliveryDetails.deliveredAt).toLocaleString("vi-VN")}</p>}
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-[40vh] flex flex-col gap-3 mb-4">
                            {deliveryDetails.itemList?.map(item => (
                                <div key={item.id} className="flex items-center bg-gray-100 p-3 rounded-lg">
                                    <img src={item.imageUrl || '404'} alt={item.variantName || 'Product'} className="w-20 h-20 object-cover rounded-md mr-4" />
                                    <div className="flex flex-1 justify-between">
                                        <div><p className="font-medium text-gray-800 line-clamp-1">{item.variantName || 'Sản phẩm'}</p><p className="text-xs text-gray-500">{item.variantSku || 'SKU'}</p></div>
                                        <div className="flex items-center gap-2"><p className="text-gray-600 text-sm">x{item.quantity}</p><div className="text-gray-800 font-semibold">{(item.unitPrice * item.quantity || 0).toLocaleString()}₫</div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 mb-4 px-2">
                            <div className="flex-1 flex flex-col gap-1 text-gray-700">
                                <div className="flex gap-3 items-center"><FiUser className="text-xl flex-shrink-0" /><p className="font-semibold text-black">{deliveryDetails.shippingName}</p></div>
                                <div className="flex gap-3 items-center"><FiMapPin className="text-xl flex-shrink-0" /><p className="line-clamp-1" title={deliveryDetails.shippingAddress || "-"}>{deliveryDetails.shippingAddress || "-"}</p></div>
                                <div className="flex gap-3 items-center"><FiPhone className="text-xl flex-shrink-0" /><p>{deliveryDetails.shippingPhone || "-"}</p></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-end items-end gap-y-1">
                                {deliveryDetails.assignedShipperId && (
                                    <div className="grid grid-cols-[auto_1fr] gap-x-2 items-end">
                                        <span className="font-semibold text-gray-800">Nhân viên giao hàng:</span>
                                        <span className="font-semibold text-gray-800">
                                            SP{deliveryDetails.assignedShipperId}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-[auto_1fr] gap-x-2 items-end">
                                    <span className="font-semibold text-gray-800">Số tiền phải thu:</span>
                                    <span className="font-semibold text-red-500 text-lg">
                                        {deliveryDetails.codAmount?.toLocaleString()}₫</span>
                                </div>
                            </div>

                        </div>
                        {deliveryDetails.failedReason && (<div className="mt-4 p-3 bg-red-50 rounded-lg"><span className="font-semibold text-red-800">Lý do thất bại:</span><p className="text-red-700">{deliveryDetails.failedReason}</p></div>)}
                    </div>
                </div>
            )}

            {/* Assignment Panel */}
            {assignmentSelect.visible && (
                <div onClick={() => setAssignmentSelect({ visible: false, selectedOrdersData: null })} className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex justify-center items-center z-50 pb-20">
                    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-[95%] max-w-6xl p-8 overflow-hidden max-h-[90vh] relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-2xl hover:cursor-pointer" onClick={() => setAssignmentSelect({ visible: false, selectedOrdersData: null })}>&times;</button>
                        <div className="border-b pb-4 mb-6">
                            <h3 className="text-2xl font-semibold text-gray-800">{assignmentSelect.selectedOrdersData?.length > 0 ? 'Phân công giao hàng' : 'Danh sách Shipper'}</h3>
                            {assignmentSelect.selectedOrdersData?.length > 0 && <p className="text-gray-600 mt-2">Chọn shipper để phân công {assignmentSelect.selectedOrdersData?.length} đơn hàng</p>}
                        </div>
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

                        <div className={`grid gap-6 overflow-y-auto max-h-[calc(90vh-200px)] ${assignmentSelect.selectedOrdersData?.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Shipper List */}
                            <div className="border rounded-lg p-4">
                                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                    {shippers.find(s => s.warehouseId === selectedWarehouseId)?.shippersList?.length > 0 ? (
                                        shippers.find(s => s.warehouseId === selectedWarehouseId)?.shippersList.map(shipper => (
                                            <div key={shipper.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <div className="p-4 hover:bg-gray-50 transition">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 cursor-pointer" onClick={() => toggleShipperExpand(shipper.id)}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-semibold text-gray-800">SP{shipper.id}</span>
                                                                <span
                                                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${shipper.status === "ONLINE"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : "bg-gray-100 text-gray-600"
                                                                        }`}
                                                                >
                                                                    {
                                                                        shipper.status === "ONLINE"
                                                                            ? "Trực tuyến"
                                                                            : "Ngoại tuyến"
                                                                    }
                                                                </span>
                                                                {expandedShipperId === shipper.id ? <FiChevronUp /> : <FiChevronDown />}
                                                            </div>
                                                            <div className="text-sm text-gray-600 space-y-1">
                                                                <div className="flex items-center gap-2"><FiUser className="flex-shrink-0" /><span>{shipper.fullName}</span></div>
                                                                <div className="flex items-center gap-2"><FiPhone className="flex-shrink-0" /><span>{shipper.phone || shipper.phoneNumber}</span></div>
                                                                <div className="text-xs text-gray-500 mt-2">Số đơn hiện tại: <span className="font-semibold">{shipper.assignedOrders?.length || 0}</span></div>
                                                            </div>
                                                        </div>
                                                        {assignmentSelect.selectedOrdersData?.length > 0 && (
                                                            <button onClick={() => handleAssignDeliveryOrderToShipper(shipper.id, assignmentSelect.selectedOrdersData.map(o => o.id))} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition text-sm ml-4">Phân công</button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Expanded: Shipper's Assigned Orders */}
                                                {expandedShipperId === shipper.id && (
                                                    <div className="border-t bg-gray-50 p-4">
                                                        <h5 className="font-semibold text-sm mb-3 text-gray-700">Đơn hàng đang giao ({shipper.assignedOrders?.length || 0})</h5>
                                                        {isLoadingShipperDeliveries ? (
                                                            <div className="flex items-center justify-center py-4"><svg className="animate-spin h-5 w-5 text-black mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Đang tải...</div>
                                                        ) : shipper.assignedOrders?.length > 0 ? (
                                                            <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                                                {shipper.assignedOrders.map(order => (
                                                                    <div key={order.id} className="bg-green-50 border border-green-200 rounded py-2 px-4 text-sm">
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="flex gap-5 items-center">
                                                                                <span className="font-semibold text-gray-800">{order.deliveryNumber} </span>
                                                                                <span className={`px-3 py-1 rounded-full font-semibold ${statusBgColor(order.status)}`}>{statusLabel(order.status)}</span>
                                                                            </div>
                                                                            <button className="p-2 text-blue-600 hover:bg-blue-100 rounded transition" onClick={() => { setDeliveryDetails(order); setIsDetailOpen(true) }}><FiEye /></button>
                                                                        </div>
                                                                        <div className="flex-1 flex flex-col gap-0.5 text-gray-700">
                                                                            <div className="flex gap-3 items-center"><FiUser className="text-sm flex-shrink-0" /><p className="">{order.shippingName}</p></div>
                                                                            <div className="flex gap-3 items-center"><FiMapPin className="text-sm flex-shrink-0" /><p className="line-clamp-1" title={order.shippingAddress || "-"}>{order.shippingAddress || "-"}</p></div>
                                                                            <div className="flex justify-between">
                                                                                <div className="flex gap-3 items-center">
                                                                                    <FiPhone className="text-sm flex-shrink-0" /><p className="font-semibold">{order.shippingPhone || "-"}</p>
                                                                                </div>
                                                                                <span className="text-red-600 font-semibold text-base">{Number(order.codAmount).toLocaleString("vi-VN")}₫</span>
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                ))}


                                                            </div>
                                                        ) : (<p className="text-gray-500 text-sm">Chưa có đơn hàng nào</p>)}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (<div className="text-center text-gray-500 py-8">Không có shipper nào</div>)}
                                </div>
                            </div>

                            {/* Right Panel: Orders List */}
                            {assignmentSelect.selectedOrdersData?.length > 0 && (
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-semibold text-lg mb-4 text-gray-800">Đơn hàng</h4>
                                    <div className="mb-3">
                                        <div className="flex gap-4 text-sm">
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200"></span>Sẽ phân công ({assignmentSelect.selectedOrdersData?.length || 0})</span>
                                            {/* {expandedShipperId && (
                                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200"></span>Đã phân công ({shippers.find(s => s.warehouseId === selectedWarehouseId)?.shippersList?.find(sh => sh.id === expandedShipperId)?.assignedOrders?.length || 0})</span>
                                            )} */}
                                        </div>
                                    </div>
                                    <div className="space-y-3 max-h-[450px] overflow-y-auto">
                                        {assignmentSelect.selectedOrdersData?.map(order => renderOrderCard(order, 'selected'))}
                                        {/* {expandedShipperId && shippers.find(s => s.warehouseId === selectedWarehouseId)?.shippersList?.find(sh => sh.id === expandedShipperId)?.assignedOrders?.map(order => renderOrderCard(order, 'assigned'))} */}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}