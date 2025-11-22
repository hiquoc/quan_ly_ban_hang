import { useContext, useEffect, useState } from "react";
import { getStaffDetails, updateStaffDetails } from "../apis/staffApi";
import { changePassword } from "../apis/authApi";
import VerificationSection from "./VerificationSection";
import ConfirmPanel from "./ConfirmPanel";
import { PopupContext } from "../contexts/PopupContext";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getShipperDetails, updateShipperDetails } from "../apis/deliveryApi";

export default function StaffDetails({ ownerId = null, onClose = null }) {
    const navigate = useNavigate();
    const { role } = useContext(AuthContext)

    const { showPopup } = useContext(PopupContext);
    const [editForm, setEditForm] = useState({});

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
    const [forceLogout, setForceLogout] = useState(false);
    const [confirmPanel, setConfirmPanel] = useState({ visible: false, message: "", onConfirm: null });
    const [initalDetails, setInitalDetails] = useState(null)
    const [showVerifyPanel, setShowVerifyPanel] = useState(false)
    const [isVerified, setIsVerified] = useState(false)

    const closeConfirmPanel = () => setConfirmPanel({ visible: false, message: "", onConfirm: null });

    useEffect(() => {
        handleLoadDetails()
    }, [])

    const handleLoadDetails = async () => {
        let res;
        if (role === "SHIPPER")
            res = await getShipperDetails(ownerId);
        else
            res = await getStaffDetails(ownerId);
        if (res.error) return showPopup(res.error);
        setEditForm(res.data);
        setInitalDetails(res.data)
    };


    const handleUpdateDetails = async () => {
        if (editForm.fullName !== initalDetails.fullName && !editForm.fullName?.trim()) {
            return showPopup("Họ tên không được để trống!");
        }

        if (editForm.email !== initalDetails.email) {
            if (!editForm.email?.trim()) {
                return showPopup("Email không được để trống!");
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(editForm.email)) {
                return showPopup("Email không đúng định dạng!");
            }
            if (!isVerified) {
                return setShowVerifyPanel(true);
            }
        }

        if (editForm.phone !== initalDetails.phone) {
            if (!editForm.phone?.trim()) {
                return showPopup("Số điện thoại không được để trống!");
            }
            const phoneRegex = /^[0-9]{9,12}$/;
            if (!phoneRegex.test(editForm.phone)) {
                return showPopup("Số điện thoại không hợp lệ!");
            }
        }

        let res;
        if (role === "SHIPPER")
            res = await updateShipperDetails(
                ownerId,
                editForm.fullName,
                editForm.phone,
                editForm.email
            );
        else
            res = await updateStaffDetails(
                ownerId,
                editForm.fullName,
                editForm.phone,
                editForm.email
            );

        if (res.error) return showPopup("Có lỗi khi cập nhật dữ liệu!");
        showPopup("Cập nhật thông tin thành công!", "success");
        handleOnClose();
    };


    const handleChangePassword = async () => {
        if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) return showPopup("Vui lòng điền đầy đủ thông tin!");
        if (passwordForm.new !== passwordForm.confirm) return showPopup("Mật khẩu không khớp!");
        const res = await changePassword(passwordForm.new, passwordForm.current);
        if (res.error) return showPopup(res.error);
        setPasswordForm({ current: "", new: "", confirm: "" });
        setShowPasswordForm(false);
        setForceLogout(true);
    };

    const handleOnClose = () => {
        onClose();
    }

    return (<>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pb-20">
            <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4 text-black">Chỉnh sửa thông tin cá nhân</h3>
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="fullName" className="text-gray-700 font-medium">Họ và tên</label>
                        <input
                            id="fullName"
                            type="text"
                            placeholder="Nhập họ và tên"
                            value={editForm.fullName || ""}
                            onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                            className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-gray-700 font-medium">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Nhập email"
                            value={editForm.email || ""}
                            onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="phone" className="text-gray-700 font-medium">Số điện thoại</label>
                        <input
                            id="phone"
                            type="text"
                            placeholder="Nhập số điện thoại"
                            value={editForm.phone || ""}
                            onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>

                    <div className="flex justify-between mt-4 gap-2 flex-wrap">
                        <button onClick={() => handleOnClose()} className="px-4 py-2 border text-black rounded hover:bg-gray-200">Hủy</button>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setShowPasswordForm(true)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Đổi mật khẩu</button>
                            <button onClick={handleUpdateDetails} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Lưu</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>

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
                        <button onClick={() => setShowPasswordForm(false)} className="px-4 py-2 border text-black rounded hover:bg-gray-200">Hủy</button>
                        <button onClick={handleChangePassword} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">Đổi mật khẩu</button>
                    </div>
                </div>
            </div>
        )}
        {forceLogout && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center">
                    <p className="text-xl mt-5 mb-5 text-gray-700">Thay đổi mật khẩu thành công!<br />Vui lòng đăng nhập lại!</p>
                    <button onClick={() => navigate("/logout")} className="px-6 py-2 mt-2 bg-black text-white rounded font-semibold hover:bg-gray-800 transition">Xác nhận</button>
                </div>
            </div>
        )}
        {showVerifyPanel && (
            <VerificationSection
                email={editForm.email}
                setEmail={(value) => setEditForm((prev) => ({ ...prev, email: value }))}
                showPopup={showPopup}
                onVerified={() => setIsVerified(true)}
                onClose={() => setShowVerifyPanel(false)}
                secure={true}
            />
        )}
    </>)
}