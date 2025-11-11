import React, { useState } from "react";
import { FiX, FiUser, FiLock, FiUserPlus, FiPhone, FiMail } from "react-icons/fi";
import { staffRegister } from "../../../apis/authApi";
import VerificationSection from "../../../components/VerificationSection";

function AddAccountForm({ onClose, onSuccess,showPopup }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [showVerifyPanel, setShowVerifyPanel] = useState(false);
    const [errors, setErrors] = useState({});

    const inputBaseClass = "w-full pl-9 pr-3 py-2.5 border rounded focus:outline-none focus:ring-2 focus:ring-gray-800";

    const validateInputs = () => {
        const newErrors = {};
        if (!username.trim()) newErrors.username = "Tên tài khoản không được để trống.";
        if (username.length < 3) newErrors.username = "Tên tài khoản cần ít nhất 3 kí tự.";
        if (!password) newErrors.password = "Vui lòng nhập mật khẩu.";
        else if (password.length < 6) newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
        if (rePassword !== password) newErrors.rePassword = "Mật khẩu nhập lại không khớp.";
        if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) newErrors.email = "Địa chỉ email không hợp lệ.";
        if (phone && !/^(0|\+84)[0-9]{9,10}$/.test(phone)) newErrors.phone = "Số điện thoại không hợp lệ.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e, options = {}) => {
        if (e?.preventDefault) e.preventDefault();
        const verified = options.verified ?? isVerified;

        if (!validateInputs()) return;

        if (email && email.trim() !== "" && !verified) {
            return setShowVerifyPanel(true);
        }

        const res = await staffRegister(username, password, fullName, phone, email);
        if (res?.error) return showPopup(res.error);

        showPopup("Tạo tài khoản thành công!");
        onSuccess && onSuccess(res.data);
    };

    return (
        <div className="fixed inset-0 z-38 flex items-center justify-center bg-black/60">
            <div className="bg-white p-10 rounded-lg shadow w-[400px] relative transition-all duration-300 hover:shadow-xl">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl">
                    <FiX />
                </button>

                <h2 className="text-3xl font-semibold text-center mb-8 text-gray-800">Thêm tài khoản</h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Username */}
                    <div className="relative flex items-center">
                        <FiUser className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tên tài khoản"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`${inputBaseClass} border-gray-300 ${errors.username ? "border-red-500" : ""}`}
                        />
                    </div>
                    {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}

                    {/* Password */}
                    <div className="relative flex items-center">
                        <FiLock className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputBaseClass} border-gray-300 ${errors.password ? "border-red-500" : ""}`}
                        />
                    </div>
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

                    {/* Confirm Password */}
                    <div className="relative flex items-center">
                        <FiLock className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            value={rePassword}
                            onChange={(e) => setRePassword(e.target.value)}
                            className={`${inputBaseClass} border-gray-300 ${errors.rePassword ? "border-red-500" : ""}`}
                        />
                    </div>
                    {errors.rePassword && <p className="text-red-500 text-sm">{errors.rePassword}</p>}

                    {/* Full Name */}
                    <div className="relative flex items-center">
                        <FiUserPlus className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Họ và tên"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={`${inputBaseClass} border-gray-300`}
                        />
                    </div>

                    {/* Email */}
                    <div className="relative flex items-center">
                        <FiMail className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            type="email"
                            placeholder="Email (tuỳ chọn)"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setIsVerified(false);
                            }}
                            className={`${inputBaseClass} border-gray-300 ${errors.email ? "border-red-500" : ""}`}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

                    {/* Phone */}
                    <div className="relative flex items-center">
                        <FiPhone className="absolute left-3 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Số điện thoại (tuỳ chọn)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`${inputBaseClass} border-gray-300 ${errors.phone ? "border-red-500" : ""}`}
                        />
                    </div>
                    {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}

                    <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded font-medium text-lg hover:bg-gray-800 transition-all duration-200">
                        Tạo tài khoản
                    </button>
                </form>

                {/* Verification Modal */}
                {showVerifyPanel && (
                    <VerificationSection
                        email={email}
                        setEmail={setEmail}
                        showPopup={showPopup}
                        onVerified={(val) => {
                            setIsVerified(val);
                            handleSubmit(null, { verified: val });
                        }}
                        onClose={() => setShowVerifyPanel(false)}
                        secure={true}
                    />
                )}
            </div>
        </div>
    );
}

export default AddAccountForm;
