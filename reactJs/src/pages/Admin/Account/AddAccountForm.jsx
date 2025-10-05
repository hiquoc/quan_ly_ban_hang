import React, { useState } from "react";
import Popup from "../../../components/Popup";
import { staffRegister } from "../../../apis/authApi";

function AddAccountForm({ onClose, onSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [popup, setPopup] = useState({ message: "", type: "error" });

    async function handleSubmit(e) {
        e.preventDefault();
        if (!username || !password || !rePassword) {
            setPopup({ message: "Vui lòng điền đầy đủ thông tin!" });
            return;
        }
        if (password !== rePassword) {
            setPopup({ message: "Mật khẩu không khớp!" });
            return;
        }
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                setPopup({ message: "Email không đúng định dạng!", type: "error" });
                return;
            }
        }
        //chỉ cho phép số từ 9-12 chữ số
        if (phone) {
            const phoneRegex = /^[0-9]{9,12}$/;
            if (!phoneRegex.test(phone)) {
                setPopup({ message: "Số điện thoại không hợp lệ!", type: "error" });
                return;
            }
        }

        const response = await staffRegister(username, password, fullName, phone, email);
        if (response?.error) {
            setPopup({ message: response.error, type: "error" });
            return;
        }

        setPopup({ message: response.message || "Tạo tài khoản thành công!", type: "success" });
        onSuccess && onSuccess(response.data);
    }


    return (
        <div className="p-6 bg-white rounded shadow-md w-96">
            <h3 className="text-xl font-semibold mb-4">Thêm tài khoản mới</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Tài khoản" className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={rePassword} onChange={e => setRePassword(e.target.value)} type="password" placeholder="Nhập lại mật khẩu" className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" placeholder="Họ và tên" className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={email} onChange={e => setEmail(e.target.value)} type="text" placeholder="Email" className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input value={phone} onChange={e => setPhone(e.target.value)} type="text" placeholder="Số điện thoại" className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />

                <div className="flex justify-end gap-2 mt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Hủy</button>
                    <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Tạo</button>
                </div>
            </form>

            <Popup
                message={popup.message}
                type={popup.type}
                onClose={() => {
                    setPopup({ message: "" });
                    if (popup.type === "success") onClose();
                }}
                duration={3000}
            />
        </div>
    );
}

export default AddAccountForm;
