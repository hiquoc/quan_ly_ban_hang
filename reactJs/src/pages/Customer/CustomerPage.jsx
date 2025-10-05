{/** CustomerPage.jsx **/ }
import { useState, useEffect, useContext } from "react";
import { FiEdit, FiPlus, FiTrash2 } from "react-icons/fi";
import { AuthContext } from "../../contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import {
    changMainAddress,
    createAddress,
    getCustomerDetails,
    updateCustomer,
    updateAddress,
    deleteAddress
} from "../../apis/customerApi";
import Popup from "../../components/Popup";
import ConfirmPanel from "../../components/ConfirmPanel";
import { changePassword } from "../../apis/authApi";

export default function CustomerPage() {
    const { role, ownerId } = useContext(AuthContext);
    if (role !== "CUSTOMER") return <Navigate to="/" replace />;

    const [customer, setCustomer] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        gender: "",
        dateOfBirth: ""
    });
    const [editAddressForm, setEditAddressForm] = useState({
        id: null,
        street: "",
        ward: "",
        district: "",
        city: "",
        isMain: false
    });
    const [passwordForm, setPasswordForm] = useState({
        current: "",
        new: "",
        confirm: ""
    });
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    const [popup, setPopup] = useState({ message: "", type: "error" });
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [forceLogout, setForceLogout] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        handleLoadCustomer();
    }, []);

    const handleLoadCustomer = async () => {
        const res = await getCustomerDetails(ownerId);
        if (res.error) {
            console.error(res.error);
            setPopup({ message: "Có lỗi khi lấy thông tin khách hàng!", type: "error" });
            setCustomer(null);
            return;
        }
        setCustomer(res.data);
    };

    const handleUpdateCustomer = async () => {
        // if (!editForm.fullName || !editForm.phone || !editForm.email || !editForm.gender || !editForm.dateOfBirth) {
        //     setPopup({ message: "Vui lòng điền đầy đủ thông tin trước khi cập nhật!", type: "error" });
        //     return;
        // }
        const res = await updateCustomer(editForm.fullName, editForm.phone, editForm.email, editForm.gender, editForm.dateOfBirth);
        if (res.error) {
            console.error(res.error);
            setPopup({ message: "Có lỗi khi cập nhật thông tin khách hàng!", type: "error" });
            return;
        }
        setCustomer(prev => ({ ...prev, ...editForm }));
        setPopup({ message: "Cập nhật thông tin khách hàng thành công!", type: "success" });
        setShowEditForm(false);
    };

    const openAddressForm = (address = null) => {
        if (address) {
            setEditAddressForm({ ...address });
        } else {
            setEditAddressForm({ id: null, street: "", ward: "", district: "", city: "", isMain: false });
        }
        setShowAddressForm(true);
    };

    const handleSaveAddress = async () => {
        const { street, ward, district, city, id } = editAddressForm;
        if (!street || !ward || !district || !city) {
            setPopup({ message: "Vui lòng điền đầy đủ địa chỉ!", type: "error" });
            return;
        }

        if (id) {
            const res = await updateAddress(id, street, ward, district, city);
            if (res.error) {
                setPopup({ message: "Có lỗi khi cập nhật địa chỉ!", type: "error" });
                return;
            }
            setCustomer(prev => ({
                ...prev,
                addresses: prev.addresses.map(a => (a.id === id ? { ...a, street, ward, district, city } : a))
            }));
            setPopup({ message: "Cập nhật địa chỉ thành công!", type: "success" });
        } else {
            const res = await createAddress(street, ward, district, city);
            if (res.error) {
                setPopup({ message: "Có lỗi khi thêm địa chỉ mới!", type: "error" });
                return;
            }
            const newAddr = { ...editAddressForm, id: res.data, isMain: false };
            setCustomer(prev => ({ ...prev, addresses: [...prev.addresses, newAddr] }));
            setPopup({ message: "Thêm địa chỉ thành công!", type: "success" });
        }

        setShowAddressForm(false);
    };

    const handleSetMainAddress = async (id) => {
        const res = await changMainAddress(id);
        if (res.error) {
            setPopup({ message: "Có lỗi khi cập nhật địa chỉ chính!", type: "error" });
            return;
        }
        setCustomer(prev => ({
            ...prev,
            addresses: prev.addresses.map(a => ({ ...a, isMain: a.id === id }))
        }));
        setPopup({ message: "Cập nhật địa chỉ chính thành công!", type: "success" });
    };

    const handleDeleteAddress = async (id) => {
        const res = await deleteAddress(id);
        if (res.error) {
            setPopup({ message: "Có lỗi khi xóa địa chỉ!", type: "error" });
            return;
        }
        setCustomer(prev => ({
            ...prev,
            addresses: prev.addresses.filter(a => a.id !== id)
        }));
        setPopup({ message: "Xóa địa chỉ thành công!", type: "success" });
    };

    const handleChangePassword = async () => {
        if (passwordForm.current == null || passwordForm.new == null || passwordForm.confirm == null) {
            setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" })
            return;
        }
        if (passwordForm.new !== passwordForm.confirm) {
            setPopup({ message: "Mật khẩu không khớp!", type: "error" })
            return;
        }
        const res = await changePassword(passwordForm.new, passwordForm.current);
        if (res.error) {
            console.log(res.error)
            setPopup({ message: res.error, type: "error" })
            return;
        }
        setPasswordForm({ current: "", new: "", confirm: "" })
        setShowPasswordForm(false)
        setForceLogout(true)
    }
    const formattedEditForm = {
        ...editForm,
        dateOfBirth: editForm.dateOfBirth ? editForm.dateOfBirth.split("T")[0] : ""
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white shadow rounded-lg p-6 flex flex-col gap-3">
                    <h3 className="text-red-600 font-semibold text-lg">Thông tin cá nhân</h3>
                    <p><strong>Họ và tên:</strong> {customer?.fullName}</p>
                    <p><strong>Email:</strong> {customer?.email}</p>
                    <p><strong>SĐT:</strong> {customer?.phone}</p>
                    <p><strong>Giới tính:</strong> {customer?.gender}</p>
                    <p><strong>Ngày sinh:</strong> {customer?.dateOfBirth}</p>
                    <div className="flex gap-2 mt-3">
                        <button
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                            onClick={() => { setEditForm(customer); setShowEditForm(true); }}
                        >
                            <FiEdit /> Chỉnh sửa
                        </button>
                        <button
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                            onClick={() => setShowPasswordForm(true)}
                        >
                            🔑 Đổi mật khẩu
                        </button>
                    </div>
                </div>
            </div>

            {/* CHANGE PASSWORD FORM */}
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

            <div className="bg-white shadow rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-red-600 font-semibold text-lg">Địa chỉ giao hàng</h3>
                    <button
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                        onClick={() => openAddressForm()}
                    >
                        <FiPlus /> Thêm địa chỉ
                    </button>
                </div>
                {customer?.addresses
                    ?.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0)) // main address first
                    .map(addr => (
                        <div key={addr.id} className="flex justify-between items-center border p-3 rounded mb-2 hover:bg-red-50">
                            <div className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="mainAddress"
                                    checked={addr.isMain}
                                    onChange={() => handleSetMainAddress(addr.id)}
                                    className="accent-red-600 w-4 h-4"
                                />
                                <p>{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center"
                                    onClick={() => openAddressForm(addr)}
                                >
                                    <FiEdit />
                                </button>
                                <button
                                    className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
                                    onClick={() => setConfirmPanel({
                                        visible: true,
                                        message: `Bạn có chắc muốn xóa địa chỉ này?`,
                                        onConfirm: () => handleDeleteAddress(addr.id)
                                    })}
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>
                    ))}

            </div>

            {/* CUSTOMER EDIT FORM */}
            {showEditForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
                        <h3 className="text-lg font-semibold mb-4 text-red-600">Chỉnh sửa khách hàng</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input
                                type="text"
                                placeholder="Họ và tên"
                                value={formattedEditForm.fullName || ""}
                                onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                                className="border p-2 rounded"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={formattedEditForm.email || ""}
                                onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                className="border p-2 rounded"
                            />
                            <input
                                type="text"
                                placeholder="SĐT"
                                value={formattedEditForm.phone || ""}
                                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="border p-2 rounded"
                            />
                            <div className="flex items-center gap-6">
                                {["Nam", "Nữ", "Khác"].map(g => (
                                    <label key={g} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value={g}
                                            checked={formattedEditForm.gender === g}
                                            onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                            className="accent-red-600 w-4 h-4"
                                        />
                                        <span>{g}</span>
                                    </label>
                                ))}
                            </div>
                            <input
                                type="date"
                                value={formattedEditForm.dateOfBirth || ""}
                                onChange={e => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                className="border p-2 rounded"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowEditForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Hủy</button>
                            <button onClick={handleUpdateCustomer} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddressForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
                        <h3 className="text-lg font-semibold mb-4 text-red-600">{editAddressForm.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input type="text" placeholder="Số nhà và tên đường" value={editAddressForm.street} onChange={e => setEditAddressForm(prev => ({ ...prev, street: e.target.value }))} className="border p-2 rounded" />
                            <input type="text" placeholder="Phường" value={editAddressForm.ward} onChange={e => setEditAddressForm(prev => ({ ...prev, ward: e.target.value }))} className="border p-2 rounded" />
                            <input type="text" placeholder="Quận/Huyện" value={editAddressForm.district} onChange={e => setEditAddressForm(prev => ({ ...prev, district: e.target.value }))} className="border p-2 rounded" />
                            <input type="text" placeholder="Thành phố/Tỉnh" value={editAddressForm.city} onChange={e => setEditAddressForm(prev => ({ ...prev, city: e.target.value }))} className="border p-2 rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowAddressForm(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Hủy</button>
                            <button onClick={handleSaveAddress} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">{editAddressForm.id ? "Cập nhật" : "Thêm"}</button>
                        </div>
                    </div>
                </div>
            )}
            {forceLogout && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="absolute inset-0 bg-black/50"></div>
                    <div className="relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center">
                        <p className="text-xl mt-5 mb-5 text-red-600">
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
            <Popup message={popup.message} type={popup.type} onClose={() => setPopup({ message: "", type: "error" })} duration={4000} />
            <ConfirmPanel
                visible={confirmPanel.visible}
                message={confirmPanel.message}
                onConfirm={() => { confirmPanel.onConfirm && confirmPanel.onConfirm(); setConfirmPanel({ visible: false, message: "", onConfirm: null }); }}
                onCancel={() => setConfirmPanel({ visible: false, message: "", onConfirm: null })}
            />
        </div>
    );
}
