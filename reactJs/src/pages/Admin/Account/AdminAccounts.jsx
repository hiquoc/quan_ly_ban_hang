import { useEffect, useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import AddAccountForm from "./AddAccountForm";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import CustomerDetails from "../../../components/CustomerDetails";
import {
  changeAccountActive,
  deleteAccount,
  getAllAccounts,
  changeAccountRole,
  changePassword
} from "../../../apis/authApi";
import { getStaffDetails, updateStaffDetails } from "../../../apis/staffApi";
import { FiRefreshCw } from "react-icons/fi";
import { PopupContext } from "../../../contexts/PopupContext";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

function AdminAccounts() {
  const { role, ownerId } = useContext(AuthContext);
  const navigate = useNavigate();
  const { showPopup } = useContext(PopupContext);

  if (role !== "ADMIN" && role !== "MANAGER") return <Navigate to="/" replace />;

  // States
  const [accounts, setAccounts] = useState([]);
  const [pendingRoles, setPendingRoles] = useState({});
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState("code");
  const [sortRole, setSortRole] = useState("");
  const [sortActive, setSortActive] = useState(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [popup, setPopup] = useState({ message: "" });
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [formattedEditForm, setFormattedEditForm] = useState({});

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [forceLogout, setForceLogout] = useState(false);

  // Fetch accounts
  const getData = async (page = currentPage) => {
    const res = await getAllAccounts(page, itemsPerPage, keyword, sortBy, sortActive, sortRole);
    if (res.error) return showPopup(res.error);
    // console.log(res.data)
    setAccounts(res.data.content || []);
    setTotalPages(res.data.totalPages || 1);
  };

  useEffect(() => {
    async function fetchData() {
      await getData();
    }
    fetchData();
  }, [currentPage, sortRole, sortActive]);


  // Handlers
  const handleRoleChange = async (accountId, newRole) => {
    const roleMap = { ADMIN: 1, MANAGER: 2, STAFF: 3 };
    const result = await changeAccountRole(accountId, roleMap[newRole]);
    if (result?.error) return setPopup({ message: result.error, type: "error" });
    setPopup({ message: "Thay đổi quyền thành công!", type: "success" });
    setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, role: newRole } : acc));
    setPendingRoles(prev => { const copy = { ...prev }; delete copy[accountId]; return copy; });
  };

  const handleToggleActive = async (id) => {
    const result = await changeAccountActive(id);
    if (result?.error) return setPopup({ message: result.error, type: "error" });
    setPopup({ message: "Thay đổi trạng thái thành công!", type: "success" });
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, active: !acc.active } : acc));
  };

  const handleDeleteAccount = async (id) => {
    const result = await deleteAccount(id);
    if (result?.error) return setPopup({ message: result.error, type: "error" });
    setPopup({ message: "Xóa tài khoản thành công!", type: "success" });
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const handleLoadStaffDetails = async () => {
    const res = await getStaffDetails(ownerId);
    if (res.error) return setPopup({ message: "Có lỗi khi lấy dữ liệu!", type: "error" });
    setEditForm(res.data);
    setFormattedEditForm(res.data);
    setShowEditForm(true);
  };

  const handleUpdateStaffDetails = async () => {
    if (!formattedEditForm.fullName || formattedEditForm.fullName === "",
      !formattedEditForm.email || formattedEditForm.email === "",
      !formattedEditForm.phone || formattedEditForm.phone === ""
    ) {
      setPopup({ message: "Vui lòng điền đầy đủ thông tin!" });
      return;
    }
    if (formattedEditForm.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formattedEditForm.email)) {
        setPopup({ message: "Email không đúng định dạng!", type: "error" });
        return;
      }
    }
    if (formattedEditForm.phone) {
      const phoneRegex = /^[0-9]{9,12}$/;
      if (!phoneRegex.test(formattedEditForm.phone)) {
        setPopup({ message: "Số điện thoại không hợp lệ!", type: "error" });
        return;
      }
    }
    const res = await updateStaffDetails(ownerId, formattedEditForm.fullName, formattedEditForm.phone, formattedEditForm.email);
    if (res.error) return setPopup({ message: "Có lỗi khi cập nhật dữ liệu!", type: "error" });
    setPopup({ message: "Cập nhật thông tin thành công!", type: "success" });
    setShowEditForm(false);
    getData(currentPage);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) return setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" });
    if (passwordForm.new !== passwordForm.confirm) return setPopup({ message: "Mật khẩu không khớp!", type: "error" });
    const res = await changePassword(passwordForm.new, passwordForm.current);
    if (res.error) return setPopup({ message: res.error, type: "error" });
    setPasswordForm({ current: "", new: "", confirm: "" });
    setShowPasswordForm(false);
    setForceLogout(true);
  };

  const confirmAction = (message, action) => setConfirmPanel({ visible: true, message, onConfirm: action });
  const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

  return (
    <div className="p-8 bg-white rounded min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">Quản lý tài khoản</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleLoadStaffDetails} className="px-4 py-2 border border-black rounded hover:bg-gray-200 hover:cursor-pointer">Thông tin cá nhân</button>
          <button onClick={() => setShowFormModal(true)} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 hover:cursor-pointer">Thêm tài khoản</button>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input type="text" placeholder="Từ khóa..." value={keyword} onChange={e => setKeyword(e.target.value)}
            className="p-2 flex-1 border border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-gray-700" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="p-2 border border-gray-700 rounded hover:cursor-pointer">
            <option value="code">Mã tài khoản</option>
            <option value="username">Tên tài khoản</option>
            <option value="fullname">Họ và tên</option>
            <option value="email">Email</option>
            <option value="phone">Số điện thoại</option>
          </select>
          <button onClick={() => getData()} className="px-5 py-2 text-white bg-black rounded hover:bg-gray-800 hover:cursor-pointer">Tìm</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => getData()} className="flex items-center px-4 py-2 border border-gray-700 rounded hover:bg-gray-200 hover:cursor-pointer">
            <FiRefreshCw className="h-5 w-5 mr-2" /> Làm mới
          </button>
          <select value={sortActive} onChange={e => setSortActive(e.target.value)} className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer">
            <option value="">Tất cả trạng thái</option>
            <option value={true}>Đang hoạt động</option>
            <option value={false}>Đang bị khóa</option>
          </select>
          <select value={sortRole} onChange={e => setSortRole(e.target.value)} className="w-40 p-2 border border-gray-700 rounded hover:cursor-pointer">
            <option value="">Tất cả quyền</option>
            <option value={4}>Customer</option>
            <option value={3}>Staff</option>
            <option value={2}>Manager</option>
            <option value={1}>Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              {["Mã", "Username", "Họ và tên", "Email", "SĐT", "Quyền", "Trạng thái", "Hành động"].map(head => (
                <th key={head} className="p-3 border-b border-gray-200 text-center">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {accounts.map(acc => (
              <tr key={acc.id} className="hover:bg-gray-50 transition">
                <td className="p-3 border-b border-gray-200 text-center">{acc.role !== "CUSTOMER" ? `NV${acc.id}` : `CUS${acc.id}`}</td>
                <td className="p-3 border-b border-gray-200 text-center">{acc.username}</td>
                <td className="p-3 border-b border-gray-200 text-center">{acc.fullName || "-"}</td>
                <td className="p-3 border-b border-gray-200 text-center">{acc.email || "-"}</td>
                <td className="p-3 border-b border-gray-200 text-center">{acc.phone || "-"}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  {acc.role !== "CUSTOMER" ? (
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
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  ) : acc.role}
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <button className={`py-2 px-3 rounded transition ${acc.active ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-400 text-white hover:bg-gray-500"}`}
                    onClick={() => confirmAction(`Bạn có chắc chắn muốn ${acc.active ? "khóa" : "mở khóa"} tài khoản ${acc.username}?`, () => handleToggleActive(acc.id))}>
                    {acc.active ? "Hoạt động" : "Đã khóa"}
                  </button>
                </td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {acc.role === "CUSTOMER" && <button className="bg-yellow-500 text-white py-2 px-3 rounded hover:bg-yellow-600" onClick={() => setSelectedCustomer(acc.ownerId)}>Chi tiết</button>}
                    <button className="bg-red-600 text-white py-2 px-3 rounded hover:bg-red-700" onClick={() => confirmAction(`Bạn có chắc chắn muốn xóa tài khoản ${acc.username}?`, () => handleDeleteAccount(acc.id))}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
            disabled={currentPage === 0}
            className={`p-3 rounded ${currentPage === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200 transition"}`}
          >
            <FaChevronLeft />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i).map((num) => (
            <button
              key={num}
              onClick={() => setCurrentPage(num)}
              className={`w-8 h-8 flex items-center justify-center rounded border transition-all
          ${currentPage === num ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"}`}
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

      {/* Modals */}
      {showFormModal && <AddAccountForm onClose={() => setShowFormModal(false)} onSuccess={() => { setShowFormModal(false); getData(); setPopup({ message: "Tạo tài khoản thành công!", type: "success" }); }} />}

      {showEditForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-black">Chỉnh sửa thông tin cá nhân</h3>
            <div className="flex flex-col gap-3">
              <input type="text" placeholder="Họ và tên" value={formattedEditForm.fullName || ""} onChange={e => setFormattedEditForm(prev => ({ ...prev, fullName: e.target.value }))} className="border p-2 rounded" />
              <input type="text" placeholder="SĐT" value={formattedEditForm.phone || ""} onChange={e => setFormattedEditForm(prev => ({ ...prev, phone: e.target.value }))} className="border p-2 rounded" />
              <input type="email" placeholder="Email" value={formattedEditForm.email || ""} onChange={e => setFormattedEditForm(prev => ({ ...prev, email: e.target.value }))} className="border p-2 rounded" />
            </div>
            <div className="flex justify-between mt-4 gap-2 flex-wrap">
              <button onClick={() => setShowEditForm(false)} className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400">Hủy</button>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setShowPasswordForm(true)} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Đổi mật khẩu</button>
                <button onClick={handleUpdateStaffDetails} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4 text-black">Đổi mật khẩu</h3>
            <div className="flex flex-col gap-3">
              <input type="password" placeholder="Mật khẩu hiện tại" value={passwordForm.current} onChange={e => setPasswordForm(prev => ({ ...prev, current: e.target.value }))} className="border p-2 rounded" />
              <input type="password" placeholder="Mật khẩu mới" value={passwordForm.new} onChange={e => setPasswordForm(prev => ({ ...prev, new: e.target.value }))} className="border p-2 rounded" />
              <input type="password" placeholder="Xác nhận mật khẩu mới" value={passwordForm.confirm} onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))} className="border p-2 rounded" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowPasswordForm(false)} className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400">Hủy</button>
              <button onClick={handleChangePassword} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Đổi mật khẩu</button>
            </div>
          </div>
        </div>
      )}

      {confirmPanel.visible && <ConfirmPanel visible={confirmPanel.visible} message={confirmPanel.message} onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); closeConfirmPanel(); }} onCancel={closeConfirmPanel} />}
      {selectedCustomer != null && <CustomerDetails visible={true} customerId={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
      <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "error" })} duration={3000} />

      {forceLogout && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center">
            <p className="text-xl mt-5 mb-5 text-green-600">Thay đổi mật khẩu thành công!<br />Vui lòng đăng nhập lại!</p>
            <button onClick={() => navigate("/logout")} className="px-6 py-2 mt-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition">Xác nhận</button>
          </div>
        </div>
      )}
    </div>

  );
}

export default AdminAccounts;
