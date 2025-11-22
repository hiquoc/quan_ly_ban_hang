import { useContext, useEffect, useState } from "react";
import AddShipperForm from "./AddShipperForm";
import { PopupContext } from "../../../contexts/PopupContext";
import { deleteAccount, getAllAccounts } from "../../../apis/authApi";
import { FiLock, FiRefreshCcw, FiTrash2, FiUnlock } from "react-icons/fi";
import { changeShipperActive, changeShipperWarehouse, getAllShippers } from "../../../apis/deliveryApi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getAllWarehouses } from "../../../apis/inventoryApi";
import ConfirmPanel from "../../../components/ConfirmPanel";

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

    useEffect(() => {
        handleLoadWarehouses();
    }, [])
    useEffect(() => {
        handleLoadShippers(0);
    }, [statusSort, warehouseSort,activeSort])

    async function handleLoadShippers(currentPage = 0) {
        try {
            setIsLoading(true)
            setPage(currentPage)
            const res = await getAllShippers(currentPage, 10, keyword, statusSort, warehouseSort,activeSort)
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


    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 4;

        if (totalPages <= maxVisible + 2) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 2) {
                pages.push(0, 1, 2, 3, "...", totalPages - 1);
            } else if (currentPage >= totalPages - 3) {
                pages.push(0, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
            } else {
                pages.push(0, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages - 1);
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
                <select value={statusSort} onChange={e => setStatusSort(e.target.value)} className="p-2 border border-gray-700 rounded hover:cursor-pointer">
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
                    value={activeSort}
                    onChange={e => setActiveSort(e.target.value === "" ? "" : e.target.value === "true")}
                    className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer"
                >
                    <option value="">Tất cả tài khoản</option>
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Đã bị khóa</option>
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
                                    value={shipper.warehouseId}>
                                    {warehouses && warehouses.map(w =>
                                        <option key={w.id} value={w.id}>{w.code}</option>
                                    )}

                                </select>
                            </td>
                            <td className="p-3 border-b border-gray-200 text-center">
                                <div className="flex justify-center gap-2 flex-wrap">
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
                    )))
                    )}

                </tbody>
            </table>
        </div>

        {totalPages > 0 && (
            <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 0))}
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
                            onClick={() => setPage(num)}
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
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages - 1))}
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
    </div>)
}