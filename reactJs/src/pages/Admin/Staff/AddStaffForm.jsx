import React, { useState, useEffect } from "react";
import { FiX, FiUser, FiLock, FiUserPlus, FiPhone, FiMail, FiHome } from "react-icons/fi";
import { staffRegister } from "../../../apis/authApi";
import VerificationSection from "../../../components/VerificationSection";

function AddStaffForm({ warehouses, onClose, onSuccess, showPopup }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [showVerifyPanel, setShowVerifyPanel] = useState(false);
    const [errors, setErrors] = useState({});
    const [isProcessing, setIsProcessing] = useState(false)

    const [selectedWarehouseId, setSelectedWarehouseId] = useState(null)

    useEffect(() => {
        setSelectedWarehouseId(warehouses?.[0]?.id || null);
    }, [])

    const validateInputs = () => {
        const newErrors = {};
        if (!username.trim()) newErrors.username = "Tên tài khoản không được để trống.";
        else if (username.length < 3) newErrors.username = "Tên tài khoản cần ít nhất 3 kí tự.";

        if (!password) newErrors.password = "Vui lòng nhập mật khẩu.";
        else if (password.length < 6) newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";

        if (rePassword !== password) newErrors.rePassword = "Mật khẩu nhập lại không khớp.";

        if (!fullName.trim()) {
            newErrors.fullName = "Họ và tên không được để trống";
        } else if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(fullName)) {
            newErrors.fullName = "Họ và tên chỉ được chứa chữ cái và khoảng trắng";
        }

        if (email.length !== 0 && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
            newErrors.email = "Địa chỉ email không hợp lệ.";
        }

        if (phone.length !== 0 && !/^(0|\+84)[0-9]{9,10}$/.test(phone)) {
            newErrors.phone = "Số điện thoại không hợp lệ.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e, options = {}) => {
        if (isProcessing) return;
        try {
            setIsProcessing(true)
            if (e?.preventDefault) e.preventDefault();
            const verified = options.verified ?? isVerified;

            if (!validateInputs()) return;

            if (email && email.trim() !== "" && !verified) {
                return setShowVerifyPanel(true);
            }

            const res = await staffRegister(username, password, fullName, phone, email, selectedWarehouseId, true);
            if (res?.error) return showPopup(res.error);

            showPopup("Tạo tài khoản thành công!");
            onSuccess && onSuccess(res.data);
        } finally {
            setIsProcessing(false)
        }
    };

    const inputClasses = (hasError) => `
           w-full pl-10 pr-4 py-3 border-2 rounded-lg
           transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent
           ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'}
       `;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative transform transition-all duration-300 hover:shadow-3xl">
                {/* Header */}
                <div className="rounded-t-2xl px-8 pt-6 relative">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute text-gray-500 cursor-pointer hover:text-black top-4 right-4 rounded-full p-2 transition-all duration-200"
                    >
                        <FiX size={20} />
                    </button>
                    <h2 className="text-2xl font-bold">Thêm tài khoản mới</h2>
                    <p className="text-gray-700 text-sm mt-1">Tạo tài khoản nhân viên giao hàng</p>
                </div>

                {/* Form */}
                <div onSubmit={handleSubmit} className="px-8 py-6">
                    <div className=" flex gap-6">
                        <div className="flex w-full flex-col gap-y-4">
                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tên tài khoản <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nhập tên tài khoản"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className={inputClasses(errors.username)}
                                    />
                                </div>
                                {errors.username && <p className="text-red-500 text-xs mt-1 ml-1 -mb-1">{errors.username}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        placeholder="Nhập mật khẩu"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={inputClasses(errors.password)}
                                    />
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1 ml-1 -mb-1">{errors.password}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Xác nhận mật khẩu <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        placeholder="Nhập lại mật khẩu"
                                        value={rePassword}
                                        onChange={(e) => setRePassword(e.target.value)}
                                        className={inputClasses(errors.rePassword)}
                                    />
                                </div>
                                {errors.rePassword && <p className="text-red-500 text-xs mt-1 ml-1 -mb-1">{errors.rePassword}</p>}
                            </div>
                        </div>
                        <div className="flex w-full flex-col gap-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiUserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nhập họ và tên"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className={inputClasses(errors.fullName)}
                                    />
                                </div>
                                {errors.fullName && <p className="text-red-500 text-xs mt-1 ml-1 -mb-1">{errors.fullName}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Số điện thoại <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nhập số điện thoại"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className={inputClasses(errors.phone)}
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1 -mb-1">{errors.phone}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        placeholder="Nhập email (không bắt buộc)"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setIsVerified(false);
                                        }}
                                        className={inputClasses(errors.email)}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1 -mb-1">{errors.email}</p>}
                            </div>
                            <div></div>

                            {/* Warehouse */}
                            <div className="-mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Kho phụ trách <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={18} />
                                    <select
                                        value={selectedWarehouseId || ""}
                                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent hover:bg-white hover:border-gray-300 transition-all duration-200 cursor-pointer"
                                    >
                                        {warehouses && warehouses.map(w =>
                                            <option key={w.id} value={w.id}>{w.code} | {w.name}</option>
                                        )}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full bg-black text-white py-3.5 rounded-lg font-semibold text-base hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl mt-2"
                        >
                            Tạo tài khoản
                        </button>
                    </div>
                </div>

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

export default AddStaffForm;