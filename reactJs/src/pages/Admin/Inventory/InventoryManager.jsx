import { useContext, useEffect, useState } from "react";
import { getAllInventories, getAllWarehouses, getInventoryQuantityChanges, getInventoryTransaction, updateInventoryActive } from "../../../apis/inventoryApi";
import Popup from "../../../components/Popup";
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiEye, FiClock } from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ConfirmPanel from "../../../components/ConfirmPanel";
import { AuthContext } from "../../../contexts/AuthContext";

export default function InventoryManager() {
  const { role, staffWarehouseId } = useContext(AuthContext)
  const [inventories, setInventories] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [popup, setPopup] = useState({ message: "", type: "" });
  const [showOnlyActive, setShowOnlyActive] = useState(true)
  const [warehouses, setWarehouses] = useState(null)
  const [sortWarehouseId, setSortWarehouseId] = useState(null)
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrans, setIsLoadingTrans] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionTotalPages, setTransactionTotalPages] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [dateRange, setDateRange] = useState('today');
  const [quantityData, setQuantityData] = useState(null)
  const [showChange, setShowChange] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null)

  useState(() => {
    loadWareHouse();
  }, [])

  useEffect(() => {
    if (warehouses === null) return;
    loadData(0)
  }, [showOnlyActive, sortWarehouseId])

  useEffect(() => {
    if (selectedInventory === null) return;
    handleGetInventoryQuantityChanges(selectedInventory)
  }, [selectedInventory, from, to])

  async function loadData(searchPage = page) {
    setPage(searchPage);
    setIsLoading(true);
    const [inventoryRes] = await Promise.all([
      getAllInventories(searchPage, size, searchText, sortWarehouseId, showOnlyActive)
    ]);
    if (inventoryRes?.error) {
      console.log(inventoryRes.error)
      setPopup({ message: "Không thể tải dữ liệu!" });
      setIsLoading(false);
      return;
    }
    // console.log(inventoryRes.data)
    setInventories(inventoryRes.data.content);
    setTotalPages(inventoryRes.data.totalPages);
    setIsLoading(false);
  }
  async function loadWareHouse() {
    const res = await getAllWarehouses();
    if (res.error) {
      setPopup({ message: res.error || "Lỗi khi tải danh sách kho!" });
      return
    }
    let warehouseData = res.data;
    if (role === "STAFF") {
      warehouseData = warehouseData.filter(w => w.id === staffWarehouseId)
    }
    setWarehouses(warehouseData);
    setSortWarehouseId(warehouseData[0].id)
  }

  async function loadTransaction(item, page = 0, start = startDate, end = endDate) {
    setTransactionPage(page);
    setIsLoadingTrans(true);
    const res = await getInventoryTransaction(
      item.id,
      page,
      size,
      start || null,
      end || null
    );

    if (res.error) {
      console.error(res.error);
      setPopup({ message: res.error || "Lỗi khi tải lịch sử phiếu!" });
      setIsLoadingTrans(false);
      return
    }
    // console.log(res.data)
    setTransactions(res.data.content);
    setTransactionTotalPages(res.data.totalPages);
    setIsLoadingTrans(false);
  }

  function handleViewTransactions(item) {
    setSelectedItem(item);
    setShowTransactions(true);
    loadTransaction(item, 0);
  }

  function handleSearchTransactions() {
    if (selectedItem) {
      loadTransaction(selectedItem, 0, startDate, endDate);
    }
  }
  async function handleChangeInventoryActive(id) {
    const res = await updateInventoryActive(id);
    if (res.error)
      return setPopup({ message: res.error });
    setPopup({ message: "Cập nhật trạng thái thành công!" });
    setInventories(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  async function handleGetInventoryQuantityChanges(selectedInventory) {
    const res = await getInventoryQuantityChanges(selectedInventory.id, from, to);
    if (res.error) {
      setPopup({ message: res.error });
      setQuantityData(null);
      return;
    }
    console.log("API Response:", res.data);
    setQuantityData(res.data || null);
  }
  const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

  function getPageNumbers(tPages = totalPages) {
    const pages = [];
    const maxVisible = 4;
    if (tPages <= maxVisible + 2) {
      for (let i = 0; i < tPages; i++) pages.push(i);
    } else {
      if (page <= 2) {
        pages.push(0, 1, 2, 3, "...", tPages - 1);
      } else if (page >= tPages - 3) {
        pages.push(0, "...", tPages - 4, tPages - 3, tPages - 2, tPages - 1);
      } else {
        pages.push(0, "...", page - 1, page, page + 1, "...", tPages - 1);
      }
    }
    return pages;
  }
  function handleDateRangeChange(value) {
    setDateRange(value);

    const now = new Date();
    let start = null;
    let end = null;

    switch (value) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case 'yesterday':
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;

      case '7days':
        start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case '30days':
        start = new Date();
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case '6months':
        start = new Date();
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;

      case 'custom':
        start = from ? new Date(from) : null;
        end = to ? new Date(to) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        break;


      default:
        start = null;
        end = null;
    }

    setFrom(start);
    setTo(end);
  }
  const formatDateForInput = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseDateInput = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  return (
    <div className="p-6 bg-white rounded shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Quản lý tồn kho</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { loadData(0) }}
            className="flex items-center px-4 py-2 border border-gray-700 text-gray-800 rounded hover:bg-gray-200 transition"
          >
            <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex justify-between">
        <div className="mb-6 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Tìm kiếm theo SKU"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="border p-2 rounded w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => { loadData(0) }}
            className="w-full sm:w-auto bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
          >
            Tìm
          </button>
          <select
            value={sortWarehouseId || ""}
            onChange={(e) => setSortWarehouseId(e.target.value)}
            className="border border-gray-700 rounded px-3 py-2"
          >
            {role !== "STAFF" && (
              <option value="">Tất cả kho</option>
            )}
            {warehouses &&
              warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code}
                </option>
              ))}
          </select>

        </div>

        <label className="inline-flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={() => setShowOnlyActive(!showOnlyActive)}
            className="w-5 h-5 text-black bg-white border-gray-400 rounded focus:ring-1 focus:ring-gray-600"
          />
          <span className="text-gray-800 font-medium">Chỉ hiển thị đang hoạt động</span>
        </label>


      </div>
      < div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
          <thead className="bg-gray-200 text-gray-700 font-medium">
            <tr>
              <th className="p-3 text-center border-b border-gray-300">Mã SKU</th>
              <th className="p-3 text-center border-b border-gray-300">Mã kho</th>
              <th className="p-3 text-center border-b border-gray-300">Số lượng</th>
              <th className="p-3 text-center border-b border-gray-300">Đang giữ</th>
              <th className="p-3 text-center border-b border-gray-300">Trạng thái</th>
              <th className="p-3 text-center border-b border-gray-300 w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody className="bg-white text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-4 text-gray-500 text-center align-middle">
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
            ) : (inventories.length === 0 ? (
              <tr className="hover:bg-gray-50 transition">
                <td colSpan={6} className="text-center p-3">
                  Không có kết quả
                </td>
              </tr>) : (
              inventories.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="p-3 border-b border-gray-200 text-center">{item.variant?.sku}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.warehouse?.code}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.quantity}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.reservedQuantity}</td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex justify-center items-center gap-1">
                      <span
                        onClick={() => setConfirmPanel({
                          visible: true,
                          message: `Bạn có chắc là muốn ${item.active ? "khóa" : "mở khóa"} mặt hàng với ID: ${item.id} không?`,
                          onConfirm: () => handleChangeInventoryActive(item.id)
                        })}
                        className={`px-3 py-1 text-white rounded-full cursor-pointer text-sm font-semibold ${item.active ? "bg-green-500 hover:bg-green-400" : "bg-red-500 hover:bg-red-400"}`}
                      >
                        {item.active ? "Hoạt động" : "Đã khóa"}
                      </span>
                      {item.quantity - item.reservedQuantity < 10 && (
                        <span className={`px-3 py-1 text-white rounded-full text-sm font-semibold ${item.quantity - item.reservedQuantity === 10 ? "bg-orange-500" : "bg-red-500"}`}>
                          {item.quantity - item.reservedQuantity > 0 ? "Sắp hết" : "Hết hàng"}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 border-b border-gray-200 text-center">
                    <button
                      onClick={() => handleViewTransactions(item)}
                      className="p-1 text-blue-500 hover:bg-blue-100 transition"
                      title="Lịch sử phiếu"
                    >
                      <FiEye></FiEye>
                    </button>
                    <button
                      onClick={() => { setShowChange(true); setSelectedInventory(item) }}
                      className="p-1 text-blue-500 hover:bg-blue-100 transition"
                      title="Lịch sử tồn kho"
                    >
                      <FiClock></FiClock>
                    </button>
                  </td>
                </tr>
              ))))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {
        totalPages > 0 && (
          <div className="flex justify-center items-center gap-3 mt-10 pb-5">
            <button
              onClick={() => loadData(page - 1)}
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
                  onClick={() => loadData(num)}
                  className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                        ${page === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                >
                  {num + 1}
                </button>
              )
            )}
            <button
              onClick={() => loadData(page + 1)}
              disabled={page >= totalPages - 1}
              className={`p-3 rounded ${page >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
            >
              <FaChevronRight />
            </button>
          </div>
        )
      }
      {/* Transactions Modal */}
      {
        showTransactions && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Lịch sử phiếu: {selectedItem.variant.sku}</h3>
                <button
                  onClick={() => setShowTransactions(false)}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Filter */}
              <div className="mb-4 flex gap-2 items-center">
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
                  onClick={handleSearchTransactions}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                >
                  Lọc
                </button>
              </div>

              {/* Transactions List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {isLoadingTrans ? (
                  <div className="gap-2 items-center justify-center flex">
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
                ) : (transactions.length === 0 ? (
                  <p className="text-center text-gray-500">Không có phiếu nào.</p>
                ) : (
                  transactions.map(t => (
                    <div
                      key={t.id}
                      className="border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm hover:shadow-md transition"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex gap-2 items-center px-2">
                          <span
                            className={`font-semibold ${t.transactionType === "IMPORT"
                              ? "text-green-600"
                              : t.transactionType === "EXPORT"
                                ? "text-red-600"
                                : t.transactionType === "ADJUST" ?
                                  "text-gray-800" :
                                  t.transactionType === "RESERVE" ?
                                    "text-blue-500" : "text-yellow-500"
                              }`}
                          >
                            {t.transactionType === "IMPORT"
                              ? "Nhập kho"
                              : t.transactionType === "EXPORT"
                                ? "Xuất kho"
                                : t.transactionType === "ADJUST"
                                  ? "Điều chỉnh" :
                                  t.transactionType === "RESERVE"
                                    ? "Đặt giữ hàng" : "Hủy giữ hàng"}
                          </span>
                          {/* Detail button */}
                          <button
                            onClick={() => setSelectedTransaction(t)}
                            className="p-1 text-blue-500 rounded hover:bg-blue-100 transition"
                          >
                            <FiEye></FiEye>
                          </button>
                        </div>

                        <span className="text-sm text-gray-500">
                          {new Date(t.updatedAt ? t.updatedAt : t.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Content grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 p-2 ml-4">
                        <div>
                          <span className="font-semibold">Mã phiếu:</span> {t.code}
                        </div>
                        <div>
                          <span className="font-semibold">Số lượng:</span> {t.quantity}
                        </div>
                        <div>
                          <span className="font-semibold">SKU:</span> {t.variant?.sku || "—"}
                        </div>
                        <div>
                          <span className="font-semibold">Nhân viên:</span> NV{t.updatedBy || t.createdBy}
                        </div>
                        <div>
                          <span className="font-semibold">Kho:</span> {t.warehouse?.code || "—"}
                        </div>
                        <div>
                          <span className="font-semibold">Trạng thái:</span>{" "}
                          <span
                            className={`px-3 py-1 ml-1 rounded-full font-semibold text-white ${t.status === "PENDING"
                              ? "bg-yellow-500"
                              : t.status === "COMPLETED"
                                ? "bg-green-500"
                                : "bg-red-500"
                              }`}
                          >
                            {t.status === "PENDING"
                              ? "Đang chờ"
                              : t.status === "COMPLETED"
                                ? "Hoàn tất"
                                : "Đã hủy"}
                          </span>
                        </div>

                      </div>


                    </div>
                  )))
                )}
              </div>

              {/* Pagination */}
              {transactionTotalPages > 0 && (
                <div className="flex justify-center items-center gap-3 mt-10 pb-5">
                  <button
                    onClick={() => loadTransaction(selectedItem, transactionPage - 1)}
                    disabled={transactionPage === 0}
                    className={`p-3 rounded ${transactionPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                  >
                    <FaChevronLeft />
                  </button>

                  {getPageNumbers(transactionTotalPages).map((num, i) =>
                    num === "..." ? (
                      <span key={i} className="px-2 text-gray-500">...</span>
                    ) : (
                      <button
                        key={i}
                        onClick={() => loadTransaction(selectedItem, num)}
                        className={`w-8 h-8 flex items-center justify-center rounded border transition-all
                        ${transactionPage === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
                      >
                        {num + 1}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => loadTransaction(selectedItem, transactionPage + 1)}
                    disabled={transactionPage >= transactionTotalPages - 1}
                    className={`p-3 rounded ${transactionPage >= transactionTotalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                  >
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }
      {showChange && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl p-6 relative">
            <button
              onClick={() => { setShowChange(false); setSelectedInventory(null); setQuantityData(null); }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-4">Lịch sử tồn kho: {selectedInventory.name}</h2>

            {/* Date range selector */}
            <div className="flex items-center gap-3 mb-4">
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="px-4 py-2 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white shadow-sm"
              >
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="6months">6 tháng qua</option>
                <option value="year">Năm nay</option>
                <option value="custom">Tùy chỉnh</option>
              </select>

              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={formatDateForInput(from)}
                    onChange={(e) => {
                      const date = parseDateInput(e.target.value);
                      if (date) {
                        date.setHours(0, 0, 0, 0);
                        setFrom(date);
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={formatDateForInput(to)}
                    onChange={(e) => {
                      const date = parseDateInput(e.target.value);
                      if (date) {
                        date.setHours(23, 59, 59, 999);
                        setTo(date);
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Table of quantity changes */}
            <div className="overflow-y-auto max-h-96 rounded-lg shadow-sm border border-gray-200">
              {quantityData?.dailyChanges && quantityData.dailyChanges.length > 0 ? (
                <>
                  {/* <div className="mb-2 text-sm text-gray-600">
                    Tồn kho đầu kỳ: <strong>{quantityData.from}</strong>
                  </div> */}
                  <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="text-center">
                        <th className="px-5 py-3 font-medium text-gray-900">Ngày</th>
                        <th className="px-5 py-3 font-medium text-gray-900">Thay đổi</th>
                        <th className="px-5 py-3 font-medium text-gray-900">Tồn kho cuối ngày</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-100">
                      {quantityData.dailyChanges.map((day, idx) => {
                        const isPositive = day.quantity > 0;
                        return (
                          <tr
                            key={day.date}
                            className={`transition-colors hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-gray-25' : ''
                              }`}
                          >
                            <td className="px-5 py-3 text-center whitespace-nowrap">
                              {new Date(day.date).toLocaleDateString('vi-VN')}
                            </td>

                            <td
                              className={`px-5 py-3 text-center font-medium ${isPositive ? 'text-green-600' : 'text-red-600'
                                }`}
                            >
                              {isPositive ? `+${day.quantity}` : day.quantity}
                            </td>

                            <td className="px-5 py-3 text-center font-semibold">
                              {day.runningTotal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-medium">
                      <tr className="text-center">
                        <td className="px-5 py-3">Tổng</td>
                        <td className="px-5 py-3">
                          {(() => {
                            const total = quantityData.dailyChanges.reduce((sum, d) => sum + d.quantity, 0);
                            const color = total < 0 ? "text-red-600" : total > 0 ? "text-green-600" : "text-gray-500";
                            return <span className={color}>{total}</span>;
                          })()}
                        </td>

                        <td className="px-5 py-3">
                          {quantityData.to}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </>
              ) : (
                <p className="text-center py-10 text-gray-500">Không có dữ liệu</p>
              )}
            </div>


            {popup.message && (
              <p className="text-red-500 mt-4">{popup.message}</p>
            )}
          </div>
        </div>
      )
      }

      {/* Transaction Detail Modal */}
      {
        selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-y-auto p-4">
            <div className="bg-white rounded shadow w-11/12 max-w-5xl p-10 relative my-10 max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="text-3xl font-bold text-black mb-2">Chi tiết phiếu</h3>
                  <p className="text-xl text-gray-600 font-medium">{selectedTransaction.code}</p>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-black text-4xl font-light transition-colors leading-none absolute top-4 right-4"
                >
                  ×
                </button>
              </div>

              {/* Status & Type Badges */}
              <div className="mb-5 flex flex-wrap gap-2">
                {/* Status Badge */}
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

                {/* Transaction Type Badge */}
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
                        <div className="flex justify-between items-center py-3 mt-2">
                          <span className="text-black font-bold">Tổng tiền</span>
                          <span className="text-red-500 font-bold text-xl">
                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(selectedTransaction.pricePerItem * selectedTransaction.quantity)}
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
                          "text-black"}`}>
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


      <Popup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "" })}
        duration={3000}
      />

      <ConfirmPanel
        visible={confirmPanel.visible}
        message={confirmPanel.message}
        onConfirm={async () => {
          if (confirmPanel.onConfirm) {
            await confirmPanel.onConfirm();
          }
          closeConfirmPanel();
        }}
        onCancel={closeConfirmPanel}
      />
    </div >
  );

}
