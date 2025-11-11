import { useState, useEffect, useRef } from "react";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import SearchableSelect from "../../../components/SearchableSelect";
import { getInventoryTransactions, createInventoryTransaction, getAllInventories, updateInventoryTransactionStatus, getAllWarehouses } from "../../../apis/inventoryApi";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiEye } from "react-icons/fi";
import { FaGear } from "react-icons/fa6";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { createPortal } from "react-dom";

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
    const [ignoreReserveRelease, setIgnoreReserveRelease] = useState(true)

    const [warehouses, setWarehouses] = useState([]);
    const [filteredWarehouses, setFilteredWarehouses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const [confirmStatusPanel, setConfirmStatusPanel] = useState({
        visible: false,
        code: null,
        status: "",
    });
    const [confirmNotes, setConfirmNotes] = useState("");

    const [form, setForm] = useState({
        warehouseId: null,
        variantId: null,
        quantity: 0,
        transactionType: "IMPORT",
        note: ""
    });
    const buttonRefs = useRef({});
    const [dropdownOpen, setDropdownOpen] = useState({});

    const DropdownMenu = ({ buttonRef, dropdownOpen, setDropdownOpen, onSelect }) => {
        const dropdownRef = useRef(null);
        const [pos, setPos] = useState({ top: 0, left: 0 });

        useEffect(() => {
            if (dropdownOpen && buttonRef) {
                const rect = buttonRef.getBoundingClientRect();
                setPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
            }
        }, [dropdownOpen, buttonRef]);

        useEffect(() => {
            const handleClickOutside = (e) => {
                if (
                    dropdownRef.current &&
                    !dropdownRef.current.contains(e.target) &&
                    buttonRef &&
                    !buttonRef.contains(e.target)
                ) {
                    setDropdownOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [buttonRef, setDropdownOpen]);

        if (!dropdownOpen) return null;

        const handleSelect = (status) => {
            onSelect(status);
            setDropdownOpen(false);
        };

        return createPortal(
            <div
                ref={dropdownRef}
                style={{ top: pos.top, left: pos.left }}
                className="absolute z-50 w-28 bg-white border border-gray-200 rounded shadow-lg"
            >
                <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-green-500"
                    onClick={() => handleSelect("COMPLETED")}
                >
                    Hoàn tất
                </button>
                <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                    onClick={() => handleSelect("CANCELLED")}
                >
                    Hủy
                </button>
            </div>,
            document.body
        );
    };

    useEffect(() => {
        loadTransactions(0)
    }, []);

    useEffect(() => {
        if (warehouses.length === 0) return;
        loadInventoriesBaseOnWarehouseId();
    }, [form.warehouseId])

    async function loadTransactions(page,
        status = null,
        type = transactionType,
        start = startDate,
        end = endDate,
        searchKeyword = keyword,
        searchType = keywordType,
        ignore = ignoreReserveRelease,
    ) {
        console.log(1)
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
                typeToSend,
                ignore
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

    async function loadWarehouse() {
        const res = await getAllWarehouses();
        if (res.error) return setPopup({ message: res.error })
        setWarehouses(res.data);
        setFilteredWarehouses(res.data)
    }
    async function loadInventoriesBaseOnWarehouseId(keyword = "") {
        const res = await getAllInventories(0, 5, keyword, form.warehouseId, true)
        if (res.error) return //setPopup({ message: res.error })
        setInventories(res.data.content);
    }

    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    function handleOpenForm() {
        loadWarehouse();
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
        setTransactions(prev => [res.data, ...prev])
    }
    function getPageNumbers() {
        const pages = [];
        const maxVisible = 4;
        if (transactionTotalPages <= maxVisible + 2) {
            for (let i = 0; i < transactionTotalPages; i++) pages.push(i);
        } else {
            if (transactionPage <= 2) {
                pages.push(0, 1, 2, 3, "...", transactionTotalPages - 1);
            } else if (transactionPage >= transactionTotalPages - 3) {
                pages.push(0, "...", transactionTotalPages - 4, transactionTotalPages - 3, transactionTotalPages - 2, transactionTotalPages - 1);
            } else {
                pages.push(0, "...", transactionPage - 1, transactionPage, transactionPage + 1, "...", transactionTotalPages - 1);
            }
        }
        return pages;
    }
    return (
        <div className="p-6 bg-white rounded shadow">
            {/* Header */}
            <div className=" md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex justify-between">
                    <h3 className="text-2xl font-semibold text-gray-800">Lịch sử phiếu</h3>
                    <button
                        onClick={handleOpenForm}
                        className="px-3 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
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
                <div className="flex items-center justify-center gap-2">
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
                                    <tr key={t.id} className="hover:bg-gray-100 transition">
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
                                        <td className="p-4 text-center border-b border-gray-200 relative overflow-visible">
                                            {t.status === "PENDING" && t.transactionType !== "RESERVE" ? (
                                                <>
                                                    <button
                                                        ref={(el) => (buttonRefs.current[t.id] = el)}
                                                        onClick={() => setDropdownOpen((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                                                        className="px-3 py-1 text-sm rounded-full font-semibold cursor-pointer transition bg-yellow-500 text-white hover:bg-yellow-400"
                                                    >
                                                        Đang xử lý
                                                    </button>

                                                    <DropdownMenu
                                                        buttonRef={buttonRefs.current[t.id]}
                                                        dropdownOpen={dropdownOpen[t.id]}
                                                        setDropdownOpen={(val) =>
                                                            setDropdownOpen((prev) => ({ ...prev, [t.id]: val }))
                                                        }
                                                        onSelect={(status) =>
                                                            setConfirmStatusPanel({ visible: true, id: t.id, status, code: t.code })
                                                        }
                                                    />
                                                </>
                                            ) : (
                                                (() => {
                                                    const statusMap = {
                                                        PENDING: { label: "Đang xử lý", color: "bg-yellow-500" },
                                                        COMPLETED: { label: "Hoàn tất", color: "bg-green-500" },
                                                        CANCELLED: { label: "Đã hủy", color: "bg-red-500" },
                                                    };
                                                    const { label, color } = statusMap[t.status] || {};
                                                    return (
                                                        <button
                                                            disabled
                                                            className={`px-3 py-1 text-sm rounded-full text-white ${color} cursor-not-allowed`}
                                                        >
                                                            {label}
                                                        </button>
                                                    );
                                                })()
                                            )}
                                        </td>

                                        <td className="p-4 text-center border-b border-gray-200">
                                            <button
                                                onClick={() => setSelectedTransaction(t)}
                                                className="p-2 text-blue-600  hover:bg-blue-100 rounded transition"
                                            >
                                                <FiEye></FiEye>
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
            {transactionTotalPages > 0 && (
                <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                    <button
                        onClick={() => loadTransactions(transactionPage - 1, status, transactionType, startDate, endDate)}
                        disabled={transactionPage === 0}
                        className={`p-3 rounded ${transactionPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                    >
                        <FaChevronLeft />
                    </button>

                    {getPageNumbers().map((num, i) =>
                        num === "..." ? (
                            <span key={i} className="px-2 text-gray-500">...</span>
                        ) : (
                            <button
                                key={i}
                                onClick={() => loadTransactions(num, status, transactionType, startDate, endDate)}
                                className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                                                              ${transactionPage === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                            >
                                {num + 1}
                            </button>
                        )
                    )}

                    <button
                        onClick={() => loadTransactions(transactionPage + 1, status, transactionType, startDate, endDate)}
                        disabled={transactionPage >= transactionTotalPages - 1}
                        className={`p-3 rounded ${transactionPage >= transactionTotalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            {/* Popup */}
            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "" })} duration={3000} />
            {showSortSettings && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 pb-20">
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
                        <div className="mb-3 flex items-center space-x-2">
                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={!!ignoreReserveRelease}
                                    onChange={() => setIgnoreReserveRelease(prev => !prev)}
                                />
                                <span className="ml-2 text-gray-700 font-medium">
                                    Hiển thị đặt/ hủy giữ hàng
                                </span>
                            </label>
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
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Đặt lại
                            </button>
                            <button
                                onClick={() => {
                                    setShowSortSettings(false);
                                    loadTransactions(0, status, transactionType, startDate, endDate);
                                }}
                                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                            >
                                Lọc
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Transaction Form */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[750px] max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4">Tạo phiếu</h3>

                        {/* Kho */}
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Kho</h4>
                            <SearchableSelect
                                options={filteredWarehouses.map(w => ({ label: `${w.code} | ${w.name}`, value: w.id }))}
                                value={form.warehouseId}
                                onChange={id => setForm({ ...form, warehouseId: id })}
                                placeholder="Chọn kho..."
                                onInputChange={input => {
                                    if (!input) {
                                        setFilteredWarehouses(warehouses);
                                        return;
                                    }
                                    const keyword = input.toLowerCase();
                                    setFilteredWarehouses(
                                        warehouses.filter(
                                            w => w.code.toLowerCase().includes(keyword) || w.name.toLowerCase().includes(keyword)
                                        )
                                    );
                                }}
                            />
                        </div>

                        {/* Sản phẩm */}
                        <div className="mb-4">
                            <h4 className="font-semibold mb-2">Sản phẩm</h4>
                            <SearchableSelect
                                options={inventories
                                    .map(inv => ({
                                        label: `${inv.variant.sku || inv.variant.productName} | ${inv.variant.productName}`,
                                        value: inv.variant.id
                                    }))}
                                value={form.variantId}
                                onChange={id => setForm({ ...form, variantId: id })}
                                placeholder="Chọn sản phẩm... (Tìm theo SKU biến thể)"
                                onInputChange={(input) => loadInventoriesBaseOnWarehouseId(input)}
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
                                className="px-4 py-2 border rounded hover:bg-gray-100"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleSaveTransaction}
                                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                            >
                                Tạo phiếu
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto p-4">
                    <div className="bg-white rounded shadow w-11/12 max-w-5xl p-10 relative my-10 max-h-[90vh] overflow-y-auto relative">

                        {/* Header */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h3 className="text-3xl font-bold text-black mb-2">
                                    Chi tiết phiếu
                                </h3>
                                <p className="text-xl text-gray-600 font-medium">{selectedTransaction.code}</p>
                            </div>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="text-gray-400 hover:text-black text-4xl font-light transition-colors leading-none absolute top-4 right-4"
                            >
                                ×
                            </button>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-5 flex flex-wrap gap-2">
                            {/** Status badge */}
                            {(() => {
                                const statusMap = {
                                    PENDING: { label: "⏳ Đang xử lý", bg: "bg-yellow-100", text: "text-yellow-800" },
                                    COMPLETED: { label: "✓ Hoàn tất", bg: "bg-green-100", text: "text-green-800" },
                                    CANCELLED: { label: "✗ Đã hủy", bg: "bg-red-100", text: "text-red-800" },
                                };
                                const { label, bg, text } = statusMap[selectedTransaction.status] || { label: "Unknown", bg: "bg-gray-100", text: "text-gray-700" };
                                return (
                                    <span className={`inline-block px-4 py-1 rounded-full font-semibold ${bg} ${text} border border-gray-200`}>
                                        {label}
                                    </span>
                                );
                            })()}

                            {/** Transaction type badge */}
                            {(() => {
                                const typeMap = {
                                    IMPORT: { label: "📥 Nhập kho", bg: "bg-gray-100", text: "text-black" },
                                    EXPORT: { label: "📤 Xuất kho", bg: "bg-gray-100", text: "text-black" },
                                    RESERVE: { label: "🔒 Đặt giữ hàng", bg: "bg-gray-200", text: "text-gray-800" },
                                    RELEASE: { label: "🔓 Hủy giữ hàng", bg: "bg-gray-200", text: "text-gray-800" },
                                    ADJUST: { label: "⚙️ Điều chỉnh", bg: "bg-gray-100", text: "text-gray-700" },
                                };
                                const { label, bg, text } = typeMap[selectedTransaction.transactionType] || typeMap.ADJUST;
                                return (
                                    <span className={`inline-block px-4 py-1 rounded-full font-semibold ${bg} ${text} border border-gray-200`}>
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>


                        {/* Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column - Transaction Info */}
                            <div className="bg-gray-50 rounded p-6 space-y-4">
                                <h4 className="text-lg font-bold text-black mb-4 pb-2 border-b-2 border-gray-300">Thông tin giao dịch</h4>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Kho</span>
                                        <span className="text-black font-semibold">{selectedTransaction.warehouse?.code || "—"}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">SKU</span>
                                        <span className="text-black font-semibold">{selectedTransaction.variant?.sku || "—"}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Số lượng</span>
                                        <span className="text-black font-bold text-lg">{selectedTransaction.quantity}</span>
                                    </div>

                                    {selectedTransaction.transactionType !== "RESERVE" && selectedTransaction.transactionType !== "RELEASE" && (
                                        <>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                                <span className="text-gray-600 font-medium">Đơn giá</span>
                                                <span className="text-black font-semibold">
                                                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedTransaction.pricePerItem)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center py-3  mt-2">
                                                <span className="text-black font-bold">Tổng tiền</span>
                                                <span className="text-red-500 font-bold text-xl">
                                                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                                                        selectedTransaction.pricePerItem * selectedTransaction.quantity
                                                    )}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right Column - Reference & Tracking Info */}
                            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                                <h4 className="text-lg font-bold text-black mb-4 pb-2 border-b-2 border-gray-300">Thông tin theo dõi</h4>

                                <div className="space-y-3">
                                    {selectedTransaction.createdBy && (
                                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                            <span className="text-gray-600 font-medium">Nhân viên tạo</span>
                                            <span className="text-black font-semibold">NV{selectedTransaction.createdBy}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Ngày tạo</span>
                                        <span className="text-black font-semibold">{new Date(selectedTransaction.createdAt).toLocaleString("vi-VN")}</span>
                                    </div>

                                    {selectedTransaction.updatedBy && (
                                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                            <span className="text-gray-600 font-medium">Nhân viên cập nhật</span>
                                            <span className="text-black font-semibold">NV{selectedTransaction.updatedBy}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Ngày cập nhật</span>
                                        <span className="text-black font-semibold">{selectedTransaction.updatedAt ? new Date(selectedTransaction.updatedAt).toLocaleString("vi-VN") : "—"}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Loại giao dịch</span>
                                        <span className={`font-semibold px-4 py-2 rounded-full ${selectedTransaction.referenceType === "PURCHASE_ORDER" ? "bg-blue-500 text-white" :
                                            selectedTransaction.referenceType === "ORDER" ? "bg-rose-500 text-white" :
                                                "text-black"
                                            }`}>
                                            {selectedTransaction.referenceType === "PURCHASE_ORDER" ? "Đơn mua" :
                                                selectedTransaction.referenceType === "ORDER" ? "Đơn bán" : "—"}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="text-gray-600 font-medium">Mã giao dịch</span>
                                        <span className="text-black font-semibold">{selectedTransaction.referenceCode || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Note Section */}
                        {selectedTransaction.note && (
                            <div className="mt-5 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
                                <h4 className="text-sm font-bold text-yellow-800 mb-2 uppercase tracking-wide">Ghi chú</h4>
                                <p className="text-gray-800 leading-relaxed">{selectedTransaction.note}</p>
                            </div>
                        )}

                        {/* Action Button */}
                        <div className="flex justify-end mt-5 pt-6 border-t-2 border-gray-200">
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="px-10 py-3 bg-black text-white rounded hover:bg-gray-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
            {confirmStatusPanel.visible && (
                <div
                    className="fixed inset-0 bg-gray-800/30 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                    onClick={() => {
                        setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });
                        setConfirmNotes(""); // reset notes
                    }}
                >
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
                            Phiếu <span className="font-semibold">{confirmStatusPanel.code}</span> sẽ được chuyển sang trạng thái
                            <span className={`font-semibold px-3 rounded py-1 ${confirmStatusPanel.status === "COMPLETED" ? "text-green-500" : "text-red-500"}`}>
                                {confirmStatusPanel.status === "COMPLETED" ? "Hoàn tất" : "Đã hủy"}
                            </span>
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
                                className="px-4 py-2 rounded border hover:bg-gray-100"
                                onClick={() => {
                                    setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });
                                    setConfirmNotes("");
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                                onClick={async () => {
                                    const { id, status } = confirmStatusPanel;

                                    setConfirmStatusPanel({ ...confirmStatusPanel, visible: false });

                                    const res = await updateInventoryTransactionStatus(id, status, confirmNotes);
                                    if (res.error) return setPopup({ message: res.error });
                                    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: status } : t))
                                    // loadTransactions(transactionPage);
                                    setPopup({ message: "Cập nhật trạng thái thành công!", type: "success" });
                                    setConfirmNotes("");
                                }}
                            >
                                Xác nhận
                            </button>

                        </div>
                    </div>
                </div>
            )}
            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); closeConfirmPanel(); }}
                onCancel={closeConfirmPanel}
            />

        </div >
    );
}
