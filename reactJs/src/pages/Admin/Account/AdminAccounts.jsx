import { useEffect, useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import AddAccountForm from "./AddAccountForm";
import Popup from "../../../components/Popup";
import ConfirmPanel from "../../../components/ConfirmPanel";
import CustomerDetails from "../../../components/CustomerDetails";
import { changeAccountActive, deleteAccount, getAllAccounts, changeAccountRole, changePassword } from "../../../apis/authApi";
import { getAllCustomers } from "../../../apis/customerApi";
import { getAllStaffs, getStaffDetails, updateStaffDetails } from "../../../apis/staffApi";
import { FiRefreshCw } from "react-icons/fi";

function AdminAccounts() {
  const { role, ownerId } = useContext(AuthContext);
  if (role !== "ADMIN" && role !== "MANAGER") return <Navigate to="/" replace />;

  const [accounts, setAccounts] = useState([]);
  const [pendingRoles, setPendingRoles] = useState({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [popup, setPopup] = useState({ message: "" });
  const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [formattedEditForm, setFormattedEditForm] = useState({});

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [forceLogout, setForceLogout] = useState(false);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const navigate=useNavigate();

  const mergeAccounts = (accounts, users, customers) => {
    return accounts.map(acc => {
      const profile =
        acc.role === "CUSTOMER"
          ? customers.find(c => c.id === acc.ownerId)
          : users.find(u => u.id === acc.ownerId);
      if (profile) {
        const { id, ...otherFields } = profile;
        return { ...acc, ...otherFields };
      }
      return acc;
    });
  };

  const getData = async () => {
    try {
      const [accRes, userRes, customerRes] = await Promise.all([
        getAllAccounts(),
        getAllStaffs(),
        getAllCustomers(),
      ]);
      setAccounts(mergeAccounts(accRes.data, userRes.data, customerRes.data));
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setPopup({ message: "Failed to load accounts." });
    }
  };

  useEffect(() => { getData(); }, []);

  useEffect(() => {
    let filtered = accounts.filter(acc =>
      acc.username.toLowerCase().includes(search.toLowerCase()) ||
      (acc.email && acc.email.toLowerCase().includes(search.toLowerCase())) ||
      (acc.fullName.toLowerCase().includes(search.toLowerCase()))
    );
    if (roleFilter !== "ALL") filtered = filtered.filter(acc => acc.role === roleFilter);
    setFilteredAccounts(filtered);
    setCurrentPage(1);
  }, [search, accounts, roleFilter]);

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  };

  const handleRoleChange = async (accountId, newRole) => {
    let roleId = 3;
    if (newRole === "ADMIN") roleId = 1;
    else if (newRole === "MANAGER") roleId = 2;

    const result = await changeAccountRole(accountId, roleId);
    if (result?.error) {
      setPopup({ message: result.error, type: "error" });
    } else {
      setPopup({ message: "Thay đổi quyền thành công!", type: "success" });
      setAccounts(prev =>
        prev.map(acc => acc.id === accountId ? { ...acc, role: newRole } : acc)
      );
    }
    setPendingRoles(prev => {
      const copy = { ...prev };
      delete copy[accountId];
      return copy;
    });
  };

  const handleToggleActive = async (id) => {
    const result = await changeAccountActive(id);
    if (result?.error) {
      setPopup({ message: result.error, type: "error" });
    } else {
      setPopup({ message: "Thay đổi trạng thái thành công!", type: "success" });
      setAccounts(prev =>
        prev.map(acc => acc.id === id ? { ...acc, active: !acc.active } : acc)
      );
    }
  };

  const handleDeleteAccount = async (id) => {
    const result = await deleteAccount(id);
    if (result?.error) {
      setPopup({ message: result.error, type: "error" });
    } else {
      setPopup({ message: "Xóa tài khoản thành công!", type: "success" });
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    }
  };

  const handleLoadStaffDetails = async () => {
    const res = await getStaffDetails(ownerId);
    if (res.error) {
      console.log(res.error)
      setPopup({ message: "Có lỗi khi lấy dữ liệu!", type: "error" })
      return;
    }
    setEditForm(res.data);
    setFormattedEditForm(res.data);
    setShowEditForm(true);
  };

  const handleUpdateStaffDetails = async () => {
    const res = await updateStaffDetails(ownerId, formattedEditForm.fullName, formattedEditForm.phone, formattedEditForm.email);
    if (res.error) {
      console.log(res.error)
      setPopup({ message: "Có lỗi khi cập nhật dữ liệu!", type: "error" })
      return;
    }
    setPopup({ message: "Cập nhật thông tin thành công!", type: "success" })
    setShowEditForm(false);
    getData();
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPopup({ message: "Mật khẩu không khớp!", type: "error" });
      return;
    }
    const res = await changePassword(passwordForm.new, passwordForm.current);
    if (res.error) {
      console.log(res.error);
      setPopup({ message: res.error, type: "error" });
      return;
    }
    setPasswordForm({ current: "", new: "", confirm: "" });
    setShowPasswordForm(false);
    setForceLogout(true);
  };

  const confirmRoleChange = (username, accountId, newRole) => {
    setPendingRoles(prev => ({ ...prev, [accountId]: newRole }));
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn đổi quyền của tài khoản "${username}" thành "${newRole}"?`,
      onConfirm: () => handleRoleChange(accountId, newRole)
    });
  };

  const confirmToggleActive = (username, id, active) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn ${active ? "khóa" : "mở khóa"} tài khoản "${username}"?`,
      onConfirm: () => handleToggleActive(id)
    });
  };

  const confirmDeleteAccount = (username, id) => {
    setConfirmPanel({
      visible: true,
      message: `Bạn có chắc chắn muốn xóa tài khoản "${username}"?`,
      onConfirm: () => handleDeleteAccount(id)
    });
  };

  const closeConfirmPanel = () => {
    setPendingRoles({});
    setConfirmPanel({ visible: false, message: "", onConfirm: null });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Tài khoản</h2>
        <div className="flex gap-2">
          <button
            onClick={handleLoadStaffDetails}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Thông tin cá nhân
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Search by username, email, or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="p-2 w-100 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex gap-2">
          {/* Reload Button */}
          <button
            onClick={getData}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-300 transition"
            title="Reload Categories"
          >
            <FiRefreshCw className="h-5 w-5 mr-2" />
            Reload
          </button>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-40 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="ALL">Tất cả</option>
            <option value="CUSTOMER">Customer</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse shadow rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 text-left">
            <tr>
              <th className="p-3 border-b border-gray-200 text-center">ID</th>
              <th className="p-3 border-b border-gray-200 text-center">Username</th>
              <th className="p-3 border-b border-gray-200 text-center">Họ và tên</th>
              <th className="p-3 border-b border-gray-200 text-center">Email</th>
              <th className="p-3 border-b border-gray-200 text-center">Số điện thoại</th>
              <th className="p-3 border-b border-gray-200 text-center">Quyền</th>
              <th className="p-3 border-b border-gray-200 text-center">Trạng thái</th>
              <th className="p-3 border-b border-gray-200 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {getCurrentPageData().slice()
              .sort((a, b) => a.id - b.id).map(acc => (
                <tr key={acc.id} className={`hover:bg-gray-50 transition `}>
                  <td className="p-3 border-b border-gray-200 text-center">{acc.id}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{acc.username}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{acc.fullName || "-"}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{acc.email || "-"}</td>
                  <td className="p-3 border-b border-gray-200 text-center">{acc.phone || "-"}</td>
                  <td className="p-3 border-b border-gray-200 text-center" >
                    {acc.role !== "CUSTOMER" ? (
                      <select
                        value={pendingRoles[acc.id] ?? acc.role}
                        onChange={e => confirmRoleChange(acc.username, acc.id, e.target.value)}
                        className={`border rounded px-2 py-1`}
                      >
                        <option value="STAFF">STAFF</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : acc.role}
                  </td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <button
                      className={`p-2 rounded transition ${acc.active
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-400 text-white hover:bg-gray-500"
                        }`}
                      onClick={() => confirmToggleActive(acc.username, acc.id, acc.active)}
                    >
                      {acc.active ? "Hoạt động" : "Đã khóa"}
                    </button>
                  </td>

                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex justify-center gap-2">
                      {acc.role === "CUSTOMER" && (
                        <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition h-10" onClick={() => setSelectedCustomer(acc.ownerId)}>
                          Chi tiết
                        </button>
                      )}
                      <button className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition h-10" onClick={() => confirmDeleteAccount(acc.username, acc.id)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Customer Details Panel */}
      {selectedCustomer != null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <CustomerDetails
            visible={!selectedCustomer}
            customerId={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        </div>
      )}

      {/* Confirm Panel */}
      <ConfirmPanel
        visible={confirmPanel.visible}
        message={confirmPanel.message}
        onConfirm={() => {
          confirmPanel.onConfirm && confirmPanel.onConfirm();
          setConfirmPanel({ visible: false, message: "", onConfirm: null });
        }}
        onCancel={closeConfirmPanel}
      />

      {/* Pagination */}
      <div className="flex justify-center mt-4 gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          Prev
        </button>
        <span className="px-3 py-1">{currentPage} / {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          Next
        </button>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <AddAccountForm
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              setPopup({ message: "Tạo tài khoản thành công!" });
              getData();
            }}
          />
        </div>
      )}

      {/* Edit Staff Form */}
      {showEditForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Chỉnh sửa thông tin cá nhân</h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                placeholder="Họ và tên"
                value={formattedEditForm.fullName || ""}
                onChange={e => setFormattedEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="border p-2 rounded"
              />
              <input
                type="text"
                placeholder="SĐT"
                value={formattedEditForm.phone || ""}
                onChange={e => setFormattedEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="border p-2 rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={formattedEditForm.email || ""}
                onChange={e => setFormattedEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="border p-2 rounded"
              />
            </div>

            <div className="flex justify-between mt-4 gap-2">
              <button
                onClick={() => setShowEditForm(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Hủy
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Đổi mật khẩu
                </button>
                <button
                  onClick={handleUpdateStaffDetails}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Form */}
      {showPasswordForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
            <h3 className="text-lg font-semibold mb-4 text-blue-600">Đổi mật khẩu</h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="password"
                placeholder="Mật khẩu hiện tại"
                value={passwordForm.current}
                onChange={e => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                className="border p-2 rounded"
              />
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={passwordForm.new}
                onChange={e => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                className="border p-2 rounded"
              />
              <input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                className="border p-2 rounded"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowPasswordForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Hủy</button>
              <button onClick={handleChangePassword} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Đổi mật khẩu</button>
            </div>
          </div>
        </div>
      )}

      <Popup
        message={popup.message}
        type={popup.type}
        onClose={() => setPopup({ message: "" })}
        duration={3000}
      />
      {forceLogout && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center">
            <p className="text-xl mt-5 mb-5 text-green-600">
              Thay đổi mật khẩu thành công!<br></br>Vui lòng đăng nhập lại!
            </p>
            <button
              onClick={() => navigate("/logout")}
              className="px-6 py-2 mt-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAccounts;
