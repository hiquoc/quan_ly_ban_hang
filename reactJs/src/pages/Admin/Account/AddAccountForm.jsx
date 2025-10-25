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

    const inputClass = "border rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-700";
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-white rounded shadow-xl w-full max-w-md p-6 z-10" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-6 text-black">Thêm tài khoản mới</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Tài khoản" className={inputClass} />
                    <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" className={inputClass} />
                    <input value={rePassword} onChange={e => setRePassword(e.target.value)} type="password" placeholder="Nhập lại mật khẩu" className={inputClass} />
                    <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" placeholder="Họ và tên" className={inputClass} />
                    <input value={email} onChange={e => setEmail(e.target.value)} type="text" placeholder="Email" className={inputClass} />
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="text" placeholder="Số điện thoại" className={inputClass} />

                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition">Hủy</button>
                        <button type="submit" className="px-5 py-2 bg-black text-white rounded hover:bg-gray-800 transition">Tạo</button>
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
        </div>
    );
}

export default AddAccountForm;
