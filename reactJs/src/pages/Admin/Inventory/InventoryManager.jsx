import { useEffect, useState } from "react";
import { getAllInventories, getInventoryTransaction } from "../../../apis/inventoryApi";
import Popup from "../../../components/Popup";
import { FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function InventoryManager() {
  const [inventories, setInventories] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [popup, setPopup] = useState({ message: "", type: "" });

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionTotalPages, setTransactionTotalPages] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    loadData()
  }, [])

  async function loadData(searchPage = page) {
    const [inventoryRes] = await Promise.all([
      getAllInventories(searchText, searchPage, size),
    ]);
    if (inventoryRes?.error) {
      console.log(inventoryRes.error)
      setPopup({ message: "Không thể tải dữ liệu!" });
      return;
    }
    setInventories(inventoryRes.data.content);
    setPage(searchPage);
    setTotalPages(inventoryRes.data.totalPages);
  }


  async function loadTransaction(item, page = 0, start = startDate, end = endDate) {
    const res = await getInventoryTransaction(
      item.id,
      page,
      size,
      start || null,
      end || null
    );
    if (res.error) {
      console.error(res.error);
      setPopup({ message: res.error || "Lỗi khi tải lịch sử giao dịch!" });
      return
    }
    setTransactions(res.data.content);
    setTransactionPage(page);
    setTransactionTotalPages(res.data.totalPages);
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

  return (
    <div className="p-6 bg-gray-50 rounded shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Quản lý tồn kho</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { loadData(0) }}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-200 transition"
          >
            <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-2">
        <input
          type="text"
          placeholder="Tìm kiếm theo SKU, kho..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="border p-2 rounded w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => { loadData(0) }}
          className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Tìm
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
          <thead className="bg-gray-200 text-gray-700 font-medium">
            <tr>
              <th className="p-3 text-center border-b border-gray-300">ID</th>
              <th className="p-3 text-center border-b border-gray-300">Mã SKU</th>
              <th className="p-3 text-center border-b border-gray-300">Mã kho</th>
              <th className="p-3 text-center border-b border-gray-300">Số lượng</th>
              <th className="p-3 text-center border-b border-gray-300">Đang giữ</th>
              <th className="p-3 text-center border-b border-gray-300 w-40">Giao dịch</th>
            </tr>
          </thead>
          <tbody className="bg-white text-gray-700">
            {inventories.length > 0 ? (
              inventories.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="p-3 border-b border-gray-200 text-center">{item.id}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.variant?.sku}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.warehouse?.code}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.quantity}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{item.reservedQuantity}</td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <button
                      onClick={() => handleViewTransactions(item)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Xem phiếu
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  Không có tồn kho nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          disabled={page === 0}
          onClick={() => loadData(page - 1)}
          className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
        >
          <FiChevronLeft className="w-5 h-5 -ml-2" />
          <span className="ml-2">Trước</span>
        </button>

        <span className="text-gray-700 font-medium text-center">
          Trang {page + 1} / {totalPages}
        </span>

        <button
          disabled={page >= totalPages - 1}
          onClick={() => loadData(page + 1)}
          className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
        >
          <span className="mr-2">Sau</span>
          <FiChevronRight className="w-5 h-5 -mr-2" />
        </button>
      </div>

      {/* Transactions Modal */}
      {showTransactions && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Lịch sử giao dịch: {selectedItem.variant.sku}</h3>
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
                className="border p-2 rounded w-36"
              />
              <span>đến</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border p-2 rounded w-36"
              />
              <button
                onClick={handleSearchTransactions}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                Lọc
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500">Không có giao dịch nào.</p>
              ) : (
                transactions.map(t => (
                  <div
                    key={t.id}
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm hover:shadow-md transition"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-1">
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
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700  p-2">
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
                          className={`px-2 py-1 rounded font-semibold text-white ${t.status === "PENDING"
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

                    {/* Detail button */}
                    <div className="flex justify-end -mt-5">
                      <button
                        onClick={() => setSelectedTransaction(t)}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-3 mt-7 text-gray-600">
              <button
                disabled={transactionPage === 0}
                onClick={() => loadTransaction(selectedItem, transactionPage - 1)}
                className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
              >
                <FiChevronLeft className="w-5 h-5" />
                <span className="ml-2">Trước</span>
              </button>
              <span className="px-3 text-base font-medium">
                Trang {transactionPage + 1} / {transactionTotalPages}
              </span>
              <button
                disabled={transactionPage >= transactionTotalPages - 1}
                onClick={() => loadTransaction(selectedItem, transactionPage + 1)}
                className="flex items-center px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 transition text-base"
              >
                <span className="mr-2">Sau</span>
                <FiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-gray-600 text-base p-2">
              {/* Left column */}
              <div className="space-y-3">
                <div className="flex">
                  <span className="font-semibold w-36 text-gray-700">Loại phiếu:</span>
                  <span className={`font-semibold ${selectedTransaction.transactionType === "IMPORT"
                    ? "text-green-600"
                    : selectedTransaction.transactionType === "EXPORT"
                      ? "text-red-600"
                      : selectedTransaction.transactionType === "ADJUST" ?
                        "text-gray-800" :
                        selectedTransaction.transactionType === "RESERVE" ?
                          "text-blue-500" : "text-yellow-500"
                    }`}>
                    {selectedTransaction.transactionType === "IMPORT"
                      ? "Nhập kho"
                      : selectedTransaction.transactionType === "EXPORT"
                        ? "Xuất kho"
                        : selectedTransaction.transactionType === "ADJUST"
                          ? "Điều chỉnh" :
                          selectedTransaction.transactionType === "RESERVE"
                            ? "Đặt giữ hàng" : "Hủy giữ hàng"}
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
                  <span>{selectedTransaction.quantity}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold w-36 text-gray-700">Trạng thái:</span>
                  <span
                    className={`px-2 py-1 rounded font-semibold text-white ${selectedTransaction.status === "PENDING"
                      ? "bg-yellow-500"
                      : selectedTransaction.status === "COMPLETED"
                        ? "bg-green-500"
                        : "bg-red-500"
                      }`}
                  >
                    {selectedTransaction.status === "PENDING"
                      ? "Đang chờ"
                      : selectedTransaction.status === "COMPLETED"
                        ? "Hoàn tất"
                        : "Đã hủy"}
                  </span>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-3">
                {selectedTransaction.createdBy && (
                  <div className="flex">
                    <span className="font-semibold w-36 text-gray-700">NV tạo:</span>
                    <span>NV{selectedTransaction.createdBy}</span>
                  </div>
                )}

                <div className="flex">
                  <span className="font-semibold w-36 text-gray-700">Ngày tạo:</span>
                  <span>{new Date(selectedTransaction.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                {selectedTransaction.updatedBy && (
                  <div className="flex">
                    <span className="font-semibold w-36 text-gray-700">NV cập nhật:</span>
                    <span>NV{selectedTransaction.updatedBy}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-semibold w-36 text-gray-700">Ngày cập nhật:</span>
                  <span>
                    {selectedTransaction.updatedAt
                      ? new Date(selectedTransaction.updatedAt).toLocaleString("vi-VN")
                      : "—"}
                  </span>
                </div>
                {selectedTransaction.referenceType && (
                  <div className="flex">
                    <span className="font-semibold w-36 text-gray-700">Loại giao dịch:</span>
                    <span>
                      {selectedTransaction.referenceType === "PURCHASE_ORDER"
                        ? "Đơn mua"
                        : selectedTransaction.referenceType === "ORDER"
                          ? "Đơn bán"
                          : selectedTransaction.referenceType === "RESERVE"
                            ? "Đặt giữ"
                            : "—"}
                    </span>
                  </div>
                )}
                {selectedTransaction.referenceCode && (
                  <div className="flex">
                    <span className="font-semibold w-36 text-gray-700">Mã giao dịch:</span>
                    <span>{selectedTransaction.referenceCode}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="col-span-2 flex">
                <span className="font-semibold text-gray-700">Ghi chú:</span>
                <p className="text-gray-600 pl-2">{selectedTransaction.note || "—"}</p>
              </div>
            </div>

            {/* Close button */}
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
      )}

      <Popup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "", type: "" })}
        duration={3000}
      />
    </div>
  );

}
