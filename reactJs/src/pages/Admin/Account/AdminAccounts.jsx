import { useEffect, useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import ConfirmPanel from "../../../components/ConfirmPanel";
import {
  changeAccountActive,
  deleteAccount,
  getAllAccounts,
  changeAccountRole,
} from "../../../apis/authApi";
import { FiRefreshCw, FiTrash2, FiEye } from "react-icons/fi";
import { PopupContext } from "../../../contexts/PopupContext";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { Helmet } from "react-helmet-async";
import AccountDetails from "./AccountDetails";

function AdminAccounts() {
  const { role, ownerId } = useContext(AuthContext);
  const { showPopup } = useContext(PopupContext);

  if (role !== "ADMIN" && role !== "MANAGER") return <Navigate to="/" replace />;

  // States
  const [accounts, setAccounts] = useState([]);
  const [pendingRoles, setPendingRoles] = useState({});
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("KH");
  const [sortRole, setSortRole] = useState("");
  const [sortActive, setSortActive] = useState(true);

  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedShipper, setSelectedShipper] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch accounts
  const getData = async (page = currentPage) => {
    setIsLoading(true);
    const res = await getAllAccounts(page, itemsPerPage, keyword, sortBy, sortActive, sortRole);
    if (res.error) {
      setIsLoading(false);
      return showPopup(res.error);
    }
    setAccounts(res.data.content || []);
    setTotalPages(res.data.totalPages || 1);
    console.log(res.data)
    setIsLoading(false);
  };

  useEffect(() => {
    getData();
  }, [currentPage, sortRole, sortActive]);

  useEffect(() => {
    setCurrentPage(0);
  }, [sortRole, sortActive]);

  // Handlers
  const handleRoleChange = async (accountId, newRole) => {
    const roleMap = { MANAGER: 2, STAFF: 3, SHIPPER: 5 };
    const result = await changeAccountRole(accountId, roleMap[newRole]);
    if (result?.error) return showPopup(result.error);
    showPopup("Thay đổi quyền thành công!", "success");
    setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, role: newRole } : acc));
    setPendingRoles(prev => { const copy = { ...prev }; delete copy[accountId]; return copy; });
  };

  const handleToggleActive = async (id) => {
    const result = await changeAccountActive(id);
    if (result?.error) return showPopup(result.error);
    showPopup("Thay đổi trạng thái thành công!", "success");
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, active: !acc.active } : acc));
  };

  const handleDeleteAccount = async (id) => {
    const result = await deleteAccount(id);
    if (result?.error) return showPopup(result.error);
    showPopup("Xóa tài khoản thành công!", "success");
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const confirmAction = (message, action) => setConfirmPanel({ visible: true, message, onConfirm: action });
  const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

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

  return (
    <>
      <Helmet>
        <title>Tài khoản</title>
      </Helmet>
      <div className="p-6 bg-white rounded min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold text-gray-800">Quản lý tài khoản</h2>
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Từ khóa..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700"
            />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="p-2 border border-gray-700 rounded hover:cursor-pointer">
              <option value="KH">Mã khách hàng</option>
              <option value="NV">Mã nhân viên</option>
              <option value="SP">Mã shipper</option>
              <option value="account">Mã tài khoản</option>
              <option value="username">Tên tài khoản</option>
              <option value="fullname">Họ và tên</option>
              <option value="email">Email</option>
              <option value="phone">Số điện thoại</option>
            </select>
            <button
              onClick={() => {
                setCurrentPage(0);
                getData(0);
              }}
              className="px-5 py-2 text-white bg-black rounded hover:bg-gray-800 hover:cursor-pointer"
            >
              Tìm
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => getData()} className="flex items-center px-4 py-2 border border-gray-700 rounded hover:bg-gray-200 hover:cursor-pointer">
              <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
            </button>
            <select
              value={sortActive}
              onChange={e => setSortActive(e.target.value === "" ? "" : e.target.value === "true")}
              className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đang bị khóa</option>
            </select>
            <select
              value={sortRole}
              onChange={e => setSortRole(e.target.value)}
              className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer"
            >
              <option value="">Tất cả quyền</option>
              <option value="4">Customer</option>
              <option value="3">Staff</option>
              <option value="5">Shipper</option>
              <option value="2">Manager</option>
              <option value="1">Admin</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-8 bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 rounded-lg overflow-hidden text-base">
            <thead className="bg-gray-200 text-gray-700">
              <tr>
                {["Mã tài khoản", "Mã NV/KH", "Username", "Họ và tên", "Email", "SĐT", "Quyền", "Trạng thái", "Hành động"].map(head => (
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
              ) : accounts.length === 0 ? (
                <tr className="hover:bg-gray-50 transition">
                  <td colSpan={9} className="text-center p-3">
                    Không có kết quả
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 border-b border-gray-200 text-center">{`TK${acc.id}`}</td>
                    <td className="p-3 border-b border-gray-200 text-center">{acc.role === "CUSTOMER" ? `KH` : acc.role === "SHIPPER" ? `SP` : `NV`}{acc.ownerId}</td>
                    <td className="p-3 border-b border-gray-200 text-center">{acc.username}</td>
                    <td className="p-3 border-b border-gray-200 text-center">{acc.fullName || "-"}</td>
                    <td className="p-3 border-b border-gray-200 text-center">{acc.email || "-"}</td>
                    <td className="p-3 border-b border-gray-200 text-center">{acc.phone || "-"}</td>
                    <td className="p-3 border-b border-gray-200 text-center">
                      {acc.role !== "CUSTOMER" && acc.role !== "SHIPPER" ? (
                        <select
                          value={pendingRoles[acc.id] ?? acc.role}
                          onChange={e => {
                            const newRole = e.target.value;
                            setPendingRoles(prev => ({ ...prev, [acc.id]: newRole }));
                            confirmAction(
                              `Bạn có chắc chắn muốn đổi quyền của ${acc.username} thành ${newRole}?`,
                              () => handleRoleChange(acc.id, newRole)
                            );
                          }}
                          className="border rounded px-2 py-1"
                        >
                          <option value="STAFF">STAFF</option>
                          <option value="MANAGER">MANAGER</option>
                        </select>
                      ) : acc.role}
                    </td>
                    <td className="p-3 border-b border-gray-200 text-center">
                      <button
                        className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition ${acc.active
                          ? "bg-green-500 text-white hover:bg-green-400"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        onClick={() => confirmAction(
                          `Bạn có chắc chắn muốn ${acc.active ? "khóa" : "mở khóa"} tài khoản ${acc.username}?`,
                          () => handleToggleActive(acc.id)
                        )}
                      >
                        {acc.active ? "Hoạt động" : "Đã khóa"}
                      </button>
                    </td>
                    <td className="p-3 border-b border-gray-200 text-center">
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                          onClick={() => {
                            if (acc.role === "CUSTOMER") {
                              setSelectedStaff(null)
                              setSelectedShipper(null)
                              setSelectedCustomer(acc.ownerId)
                            }
                            else if (acc.role !== "SHIPPER") {
                              setSelectedShipper(null)
                              setSelectedCustomer(null)
                              setSelectedStaff(acc.ownerId)
                            }
                            else {
                              setSelectedCustomer(null)
                              setSelectedStaff(null)
                              setSelectedShipper(acc.ownerId)
                            }
                          }}
                        >
                          <FiEye />
                        </button>
                        <button
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                          onClick={() => confirmAction(
                            `Bạn có chắc chắn muốn xóa tài khoản ${acc.username}?`,
                            () => handleDeleteAccount(acc.id)
                          )}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-5 pb-5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
              className={`p-3 rounded ${currentPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
            >
              <FaChevronLeft />
            </button>

            {getPageNumbers().map((num, i) =>
              num === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-500">...</span>
              ) : (
                <button
                  key={`page-${num}`}
                  onClick={() => setCurrentPage(num)}
                  className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${currentPage === num
                    ? "bg-black text-white border-black"
                    : "bg-white hover:bg-gray-100"
                    }`}
                >
                  {num + 1}
                </button>
              )
            )}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))}
              disabled={currentPage >= totalPages - 1}
              className={`p-3 rounded ${currentPage >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
            >
              <FaChevronRight />
            </button>
          </div>
        )}

        {confirmPanel.visible && (
          <ConfirmPanel
            message={confirmPanel.message}
            onConfirm={async () => {
              if (confirmPanel.onConfirm) {
                await confirmPanel.onConfirm();
              }
              closeConfirmPanel();
            }}
            onCancel={closeConfirmPanel}
          />
        )}

        {(selectedCustomer != null || selectedStaff != null || selectedShipper != null) && (
          <AccountDetails
            visible={true}
            customerId={selectedCustomer}
            staffId={selectedStaff}
            shipperId={selectedShipper}
            onClose={() => { setSelectedCustomer(null); setSelectedStaff(null); setSelectedShipper(null) }}
          />
        )}
      </div>
    </>
  );
}

export default AdminAccounts;