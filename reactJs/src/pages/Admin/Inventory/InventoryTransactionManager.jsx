import { useState, useEffect } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import SearchableSelect from "../../../components/SearchableSelect";
import { getInventoryTransactions, createInventoryTransaction, getAllInventories, updateInventoryTransactionStatus } from "../../../apis/inventoryApi";
import { FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaGear } from "react-icons/fa6";

export default function InventoryTransactionManager() {
    const [transactions, setTransactions] = useState([]);
    const [transactionPage, setTransactionPage] = useState(0);
    const [transactionTotalPages, setTransactionTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ message: "", type: "" });
    const [confirmPanel, setConfirmPanel] = useState({})

    const [inventories, setInventories] = useState([]);
    const [variants, setVariants] = useState([]);
    const [size, setSize] = useState(10);

    const [status, setStatus] = useState(null);
    const [transactionType, setTransactionType] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [keywordType, setKeywordType] = useState("ma_phieu");

    const [showSortSettings, setShowSortSettings] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [warehouses, setWarehouses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const [form, setForm] = useState({
        warehouseId: null,
        variantId: null,
        quantity: 0,
        transactionType: "IMPORT",
        note: ""
    });

    useEffect(() => {
        loadTransactions(0)
        loadData();
    }, []);

    async function loadTransactions(page,
        status = null,
        type = transactionType,
        start = startDate,
        end = endDate,
        searchKeyword = keyword,
        searchType = keywordType
    ) {
        setLoading(true);
        try {
            const keywordToSend = searchKeyword?.trim() || null;
            const typeToSend = keywordToSend ? searchType : null;

            const transactionsRes = await getInventoryTransactions(
                page,
                size,
                status,
                type,
                start,
                end,
                keywordToSend,
                typeToSend
            );

            if (transactionsRes?.error) {
                setPopup({ message: transactionsRes.error || "Lỗi khi tải giao dịch!", type: "error" });
                return;
            }

            const data = transactionsRes.data;
            setTransactions(data.content || []);
            setTransactionPage(page);
            setTransactionTotalPages(data.totalPages || 0);
        } finally {
            setLoading(false);
        }
    }

    async function loadData() {
        const [inventoryRes] = await Promise.all([
            getAllInventories()
        ]);

        if (inventoryRes?.error) {
            setPopup({ message: "Lỗi khi tải giao dịch!", type: "error" });
            return;
        }
        setInventories(inventoryRes.data.content);
        const newWarehouses = inventoryRes.data.content.map(i => i.warehouse)
        setWarehouses(prev => {
            const combined = [...prev, ...newWarehouses];
            return Array.from(new Map(combined.map(w => [w.id, w])).values());
        })
        const newVariants = inventoryRes.data.content.map(i => i.variant);
        setVariants(prev => {
            const combined = [...prev, ...newVariants];
            return Array.from(new Map(combined.map(w => [w.id, w]).values()));
        })
    }
    function handleChangeStatus(id, status) {
        setConfirmPanel({
            visible: true,
            message: `Bạn có chắc muốn ${status === "CANCELLED" ? "hủy" : "hoàn tất"} phiếu này ?`,
            onConfirm: async () => {
                const res = await updateInventoryTransactionStatus(id, status)
                if (!res.error) {
                    setTransactions((prev) => prev.map(p => (p.id === id ? { ...p, status } : p)))
                    setPopup({ message: "Cập nhật trạng thái thành công!", type: "success" });
                } else {
                    setPopup({ message: res.error, type: "error" });
                }
            }
        });
    }
    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    function handleOpenForm() {
        setForm({
            warehouseId: "",
            variantId: "",
            quantity: "",
            transactionType: "IMPORT",
            note: ""
        });
        setShowForm(true);
    }

    async function handleSaveTransaction() {
        // console.log(form.variantId, form.warehouseId, form.transactionType, form.quantity, form.note);

        const res = await createInventoryTransaction({
            variantId: form.variantId,
            warehouseId: form.warehouseId,
            transactionType: form.transactionType,
            quantity: form.quantity,
            note: form.note
        });
        if (res.error) {
            console.log(res.error)
            setPopup({ message: res.error || "Có lỗi khi tạo phiếu!", type: "error" });
            return;
        }

        setPopup({ message: "Tạo phiếu thành công!", type: "success" });
        setShowForm(false);
        loadTransactions(transactionPage);
        loadData();
    }

    return (
        <div className="p-6 bg-gray-50 rounded shadow">
            {/* Header */}
            <div className=" md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex justify-between">
                    <h3 className="text-2xl font-semibold text-gray-800">Lịch sử phiếu</h3>
                    <button
                        onClick={handleOpenForm}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Tạo phiếu
                    </button>
                </div>

                <div className="pt-3 flex justify-between sm:flex-row items-center gap-2 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="flex gap-2 items-center">
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder={`Tìm kiếm ${keywordType === "ma_phieu" ? "Mã phiếu" :
                                    keywordType === "ma_sku" ? "SKU" : "Kho"}...`}
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                className="border rounded h-11 px-3 w-full sm:w-64"
                            />
                            <select
                                value={keywordType}
                                onChange={e => setKeywordType(e.target.value)}
                                className="border rounded h-11 px-3"
                            >
                                <option value="ma_phieu">Mã phiếu</option>
                                <option value="ma_sku">SKU</option>
                                <option value="ma_kho">Kho</option>
                            </select>
                            <button
                                onClick={() => loadTransactions(0, status, transactionType, startDate, endDate, keyword, keywordType)}
                                className="flex items-center justify-center px-5 h-11 bg-black text-white rounded hover:bg-gray-800 transition"
                            >
                                Tìm
                            </button>
                        </div>

                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSortSettings(true)}
                            className="px-3 py-2 flex gap-2 items-center border rounded hover:bg-gray-200 transition"
                        >
                            <FaGear /> Lọc
                        </button>
                        <button
                            onClick={() => loadTransactions(transactionPage)}
                            className="flex items-center px-3 py-2 border rounded hover:bg-gray-200 transition"
                        >
                            <FiRefreshCw className="mr-1" /> Làm mới
                        </button>

                    </div>
                </div>

            </div>

            {/* Transactions Table */}
            {loading ? (
                <p className="text-center text-gray-500">Đang tải...</p>
            ) : (
                <div className="overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
                        <thead className="bg-gray-200 text-gray-700 text-m font-medium">
                            <tr>
                                <th className="p-4 text-center border-b border-gray-300">Mã phiếu</th>
                                <th className="p-4 text-center border-b border-gray-300">Mã SKU</th>
                                <th className="p-4 text-center border-b border-gray-300">Mã kho</th>
                                <th
                                    className={`p-4 text-center border-b border-gray-300 text-gray-700"
                                        }`}
                                >
                                    Loại
                                </th>
                                <th className="p-4 text-center border-b border-gray-300">Số lượng</th>
                                <th
                                    className={`p-4 text-center border-b border-gray-300 text-gray-700"
                                        }`}
                                >
                                    Trạng thái
                                </th>
                                <th className="p-4 text-center border-b border-gray-300">Chi tiết</th>
                                <th className="p-4 text-center border-b border-gray-300">Ngày cập nhật</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center p-3 text-gray-500">Không có giao dịch nào.</td>
                                </tr>
                            ) : (
                                transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition">
                                        <td className="p-4 text-center border-b border-gray-200">{t.code}</td>
                                        <td className="p-4 text-center border-b border-gray-200">{t.variant.sku}</td>
                                        <td className="p-4 text-center border-b border-gray-200">{t.warehouse.code}</td>
                                        <td className={`p-4 text-center border-b border-gray-200 font-semibold ${t.transactionType === "IMPORT" ? "text-green-600" :
                                            t.transactionType === "EXPORT" ? "text-red-600" :
                                                t.transactionType === "RESERVE" ? "text-blue-600" :
                                                    t.transactionType === "RELEASE" ? "text-yellow-600" :
                                                        "text-gray-600"
                                            }`}>
                                            {t.transactionType === "IMPORT" ? "Nhập kho" :
                                                t.transactionType === "EXPORT" ? "Xuất kho" :
                                                    t.transactionType === "RESERVE" ? "Đặt giữ hàng" :
                                                        t.transactionType === "RELEASE" ? "Hủy giữ hàng" : "Điều chỉnh"}
                                        </td>
                                        <td className="p-4 text-center border-b border-gray-200">{t.quantity}</td>
                                        <td className="p-4 text-center border-b border-gray-200">
                                            {(() => {
                                                if (t.status === "PENDING" && t.transactionType !== "RESERVE") {
                                                    return (
                                                        <div className="flex gap-1 justify-center">
                                                            <button
                                                                onClick={() => handleChangeStatus(t.id, "COMPLETED")}
                                                                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                            >
                                                                Hoàn tất
                                                            </button>
                                                            <button
                                                                onClick={() => handleChangeStatus(t.id, "CANCELLED")}
                                                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                            >
                                                                Hủy
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                const statusMap = {
                                                    PENDING: { label: "Đang xử lý", color: "bg-yellow-600" },
                                                    COMPLETED: { label: "Hoàn tất", color: "bg-green-600" },
                                                    CANCELLED: { label: "Đã hủy", color: "bg-red-600" },
                                                };

                                                const { label, color } = statusMap[t.status] || {};
                                                return (
                                                    <button
                                                        disabled
                                                        className={`px-3 py-2 rounded text-white ${color} cursor-not-allowed opacity-90`}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-4 text-center border-b border-gray-200">
                                            <button
                                                onClick={() => setSelectedTransaction(t)}
                                                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                            >
                                                Xem
                                            </button>
                                        </td>

                                        <td className="p-4 text-center border-b border-gray-200">{new Date(t.updatedAt ? t.updatedAt : t.createdAt).toLocaleDateString("vi-VN")}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )
            }

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-4">
                <button
                    disabled={transactionPage === 0}
                    onClick={() => loadTransactions(transactionPage - 1, status, transactionType, startDate, endDate)}
                    className="flex items-center px-3 py-2 border rounded disabled:opacity-50 hover:bg-gray-100 transition"
                >
                    <FiChevronLeft className="w-5 h-5" />
                    <span className="ml-1">Trước</span>
                </button>
                <span className="text-gray-700 font-medium text-center">Trang {transactionPage + 1} / {transactionTotalPages}</span>
                <button
                    disabled={transactionPage >= transactionTotalPages - 1}
                    onClick={() => loadTransactions(transactionPage + 1, status, transactionType, startDate, endDate)}
                    className="flex items-center px-3 py-2 border rounded disabled:opacity-50 hover:bg-gray-100 transition"
                >
                    <span className="mr-1">Sau</span>
                    <FiChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Popup */}
            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />
            {showSortSettings && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[400px] shadow-lg">
                        <div className="flex justify-between">
                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Bộ lọc giao dịch</h3>
                            <span onClick={() => setShowSortSettings(false)}
                                className="text-xl text-gray-500 font-bold -mr-2 -mt-3 hover:cursor-pointer">x</span>
                        </div>
                        {/* Status */}
                        <div className="mb-3">
                            <label className="block font-medium mb-1">Trạng thái</label>
                            <select
                                className="border p-2 rounded w-full"
                                value={status || ""}
                                onChange={e => setStatus(e.target.value || null)}
                            >
                                <option value="">Tất cả</option>
                                <option value="PENDING">Đang xử lý</option>
                                <option value="COMPLETED">Hoàn tất</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>

                        {/* Transaction Type */}
                        <div className="mb-3">
                            <label className="block font-medium mb-1">Loại giao dịch</label>
                            <select
                                className="border p-2 rounded w-full"
                                value={transactionType || ""}
                                onChange={e => setTransactionType(e.target.value || null)}
                            >
                                <option value="">Tất cả</option>
                                <option value="IMPORT">Nhập kho</option>
                                <option value="EXPORT">Xuất kho</option>
                                <option value="ADJUST">Điều chỉnh</option>
                                <option value="RESERVE">Đặt giữ hàng</option>
                                <option value="RELEASE">Hủy giữ hàng</option>
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="mb-3">
                            <label className="block font-medium mb-1">Khoảng ngày</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="border p-2 rounded w-full"
                                />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="border p-2 rounded w-full"
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setStatus(null);
                                    setTransactionType(null);
                                    setStartDate("");
                                    setEndDate("");
                                    setShowSortSettings(false);
                                    loadTransactions(0);
                                }}
                                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                            >
                                Đặt lại
                            </button>
                            <button
                                onClick={() => {
                                    setShowSortSettings(false);
                                    loadTransactions(0, status, transactionType, startDate, endDate);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Lọc
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Transaction Form */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-49">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[750px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4">Tạo giao dịch</h3>

                        {/* Kho */}
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Kho</h4>
                            <SearchableSelect
                                options={warehouses.map(w => ({ label: `${w.code} | ${w.name}`, value: w.id }))}
                                value={form.warehouseId}
                                onChange={id => setForm({ ...form, warehouseId: id })}
                                placeholder="Chọn kho..."
                            />
                        </div>

                        {/* Sản phẩm */}
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Sản phẩm</h4>
                            <SearchableSelect
                                options={inventories
                                    .filter(inv => inv.warehouse.id === form.warehouseId)
                                    .map(inv => ({
                                        label: `${inv.variant.sku || inv.variant.productName} | ${inv.variant.productName}`,
                                        value: inv.variant.id
                                    }))}
                                value={form.variantId}
                                onChange={id => setForm({ ...form, variantId: id })}
                                placeholder="Chọn sản phẩm..."
                            />
                        </div>

                        <div className="mb-4 flex gap-4">
                            {/* Loại giao dịch */}
                            <div className="w-32">
                                <h4 className="font-semibold mb-1">Loại giao dịch</h4>
                                <select
                                    className="border p-2 rounded w-full"
                                    value={form.transactionType}
                                    onChange={e => setForm({ ...form, transactionType: e.target.value })}
                                >
                                    <option value="IMPORT">Nhập kho</option>
                                    <option value="EXPORT">Xuất kho</option>
                                    <option value="ADJUST">Điều chỉnh</option>
                                </select>
                            </div>

                            {/* Tồn kho */}
                            <div className="flex-1">
                                <h4 className="font-semibold mb-1">Tồn kho</h4>
                                <input
                                    type="text"
                                    className="border p-2 rounded w-full bg-gray-100"
                                    value={
                                        inventories.find(
                                            inv =>
                                                inv.warehouse.id === form.warehouseId &&
                                                inv.variant.id === form.variantId
                                        )?.quantity || 0
                                    }
                                    readOnly
                                />
                            </div>

                            {/* Đang giữ */}
                            <div className="flex-1">
                                <h4 className="font-semibold mb-1">Đang giữ</h4>
                                <input
                                    type="text"
                                    className="border p-2 rounded w-full bg-gray-100"
                                    value={
                                        inventories.find(
                                            inv =>
                                                inv.warehouse.id === form.warehouseId &&
                                                inv.variant.id === form.variantId
                                        )?.reservedQuantity || 0
                                    }
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Số lượng & Ghi chú */}
                        <div className="mb-4 flex gap-4">
                            <input
                                type="text"
                                placeholder="Số lượng"
                                className="border p-2 rounded w-32"
                                value={form.quantity}
                                onChange={e => setForm({ ...form, quantity: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="Ghi chú"
                                className="border p-2 rounded flex-1"
                                value={form.note}
                                onChange={e => setForm({ ...form, note: e.target.value })}
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleSaveTransaction}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Tạo giao dịch
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800">
                                Chi tiết phiếu: {selectedTransaction.code}
                            </h3>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-gray-600 text-base">
                            {/* Cột trái: Loại phiếu, Kho, SKU, Số lượng */}
                            <div className="space-y-3">
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Loại phiếu:</span>
                                    <span className={`${selectedTransaction.transactionType === "IMPORT" ? "text-green-600" :
                                        selectedTransaction.transactionType === "EXPORT" ? "text-red-600" :
                                            selectedTransaction.transactionType === "RESERVE" ? "text-blue-600" :
                                                selectedTransaction.transactionType === "RELEASE" ? "text-yellow-600" :
                                                    "text-gray-800"
                                        }`}>
                                        {selectedTransaction.transactionType === "IMPORT" ? "Nhập kho" :
                                            selectedTransaction.transactionType === "EXPORT" ? "Xuất kho" :
                                                selectedTransaction.transactionType === "RESERVE" ? "Đặt giữ hàng" :
                                                    selectedTransaction.transactionType === "RELEASE" ? "Hủy giữ hàng" : "Điều chỉnh"}
                                    </span>

                                </div>
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Kho:</span>
                                    <span>{selectedTransaction.warehouse?.code || "—"}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">SKU:</span>
                                    <span>{selectedTransaction.variant?.sku || "—"}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Số lượng:</span>
                                    <span>
                                        {selectedTransaction.quantity}
                                        {selectedTransaction.transactionType !== "RESERVE" && selectedTransaction.transactionType !== "RELEASE" && (
                                            <> ({new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedTransaction.pricePerItem)})</>
                                        )}
                                    </span>
                                </div>

                                {selectedTransaction.transactionType !== "RESERVE" && selectedTransaction.transactionType !== "RELEASE" && (
                                    <div className="flex">
                                        <span className="font-semibold w-36 text-gray-700">Tổng tiền:</span>
                                        <span>
                                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                selectedTransaction.pricePerItem * selectedTransaction.quantity
                                            )}
                                        </span>
                                    </div>
                                )}

                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Trạng thái:</span>
                                    <span className={`font-semibold ${selectedTransaction.status === "PENDING" ? "text-yellow-600" :
                                        selectedTransaction.status === "COMPLETED" ? "text-green-600" :
                                            "text-red-600"
                                        }`}>
                                        {selectedTransaction.status === "PENDING" ? "Đang xử lý" :
                                            selectedTransaction.status === "COMPLETED" ? "Hoàn tất" : "Đã hủy"}
                                    </span>
                                </div>
                            </div>

                            {/* Cột phải: Người tạo/cập nhật, ngày tạo/cập nhật, tham chiếu */}
                            <div className="space-y-3">
                                {selectedTransaction.createdBy &&
                                    (<div className="flex">
                                        <span className="font-semibold w-36 text-gray-700">NV tạo:</span>
                                        <span>NV{selectedTransaction.createdBy}</span>
                                    </div>)}
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Ngày tạo:</span>
                                    <span>{new Date(selectedTransaction.createdAt).toLocaleString("vi-VN")}</span>
                                </div>
                                {selectedTransaction.updatedBy &&
                                    (<div className="flex">
                                        <span className="font-semibold w-36 text-gray-700">NV cập nhật:</span>
                                        <span>NV{selectedTransaction.updatedBy}</span>
                                    </div>)}
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Ngày cập nhật:</span>
                                    <span>{selectedTransaction.updatedAt ? new Date(selectedTransaction.updatedAt).toLocaleString("vi-VN") : "—"}</span>
                                </div>
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Loại giao dịch:</span>
                                    <span>
                                        {selectedTransaction.referenceType === "PURCHASE_ORDER" ? "Đơn mua" :
                                            selectedTransaction.referenceType === "ORDER" ? "Đơn bán" : "—"}
                                    </span>
                                </div>
                                <div className="flex">
                                    <span className="font-semibold w-36 text-gray-700">Mã giao dịch:</span>
                                    <span>{selectedTransaction.referenceCode || "—"}</span>
                                </div>
                            </div>

                            {/* Ghi chú (full width) */}
                            {selectedTransaction.note && (
                                <div className="col-span-2 flex">
                                    <span className="font-semibold text-gray-700">Ghi chú:</span>
                                    <p className="text-gray-600 pl-2 ">{selectedTransaction.note}</p>
                                </div>
                            )}

                        </div>

                        {/* Close Button */}
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); closeConfirmPanel(); }}
                onCancel={closeConfirmPanel}
            />

        </div >
    );
}
