import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    FiX,
    FiUser,
    FiLock,
    FiPhone,
    FiUserPlus,
    FiMail
} from "react-icons/fi";
import { PopupContext } from "../../contexts/PopupContext";
import { customerRegister } from "../../apis/authApi";
import VerificationSection from "../../components/VerificationSection";
import { Helmet } from "react-helmet-async";

export default function RegisterPage() {
    const navigate = useNavigate();
    const { showPopup } = useContext(PopupContext);

    // Form states
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [errors, setErrors] = useState({});
    const [isVerified, setIsVerified] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false)
    // Verification modal state
    const [showVerifyPanel, setShowVerifyPanel] = useState(false);

    // Input validation
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

    // Handle form submit
    const handleSubmit = async (e, options = {}) => {
        if (e?.preventDefault) e.preventDefault();
        if (isProcessing) return;
        try {
            setIsProcessing(true)

            const verified = options.verified ?? isVerified;

            if (!validateInputs()) return;

            if (email && email.trim() !== "" && !verified) {
                return setShowVerifyPanel(true);
            }

            const res = await customerRegister(username, password, fullName, phone, email);
            if (res.error) return showPopup(res.error);

            showPopup("Đăng ký thành công. Vui lòng đăng nhập!", "success", () => navigate(`/login`));
            setTimeout(() => {
                navigate(`/login`);
            }, 3000);
        } finally {
            setIsProcessing(false)
        }
    };

    const inputBaseClass = "w-full pl-9 pr-3 py-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-gray-800";

    return (
        <>
            <Helmet>
                <title>Đăng kí</title></Helmet>

            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="bg-white p-10 rounded-lg shadow w-[400px] relative transition-all duration-300 hover:shadow-xl">
                    <button type="button" onClick={() => navigate("/")} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl">
                        <FiX />
                    </button>

                    <h2 className="text-3xl font-semibold text-center mb-8 text-gray-800">Đăng ký</h2>

                    {/* Username */}
                    <div className="mb-3">
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
                        {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                    </div>

                    {/* Password */}
                    <div className="mb-3">
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
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-3">
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
                        {errors.rePassword && <p className="text-red-500 text-sm mt-1">{errors.rePassword}</p>}
                    </div>

                    {/* Full Name */}
                    <div className="mb-3">
                        <div className="relative flex items-center">
                            <FiUserPlus className="absolute left-3 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Họ và tên (tuỳ chọn)" value={fullName} onChange={(e) => setFullName(e.target.value)} className={`${inputBaseClass} border-gray-300`} />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="mb-3">
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
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div className="mb-5">
                        <div className="relative flex items-center">
                            <FiPhone className="absolute left-3 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Số điện thoại (tuỳ chọn)" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputBaseClass} border-gray-300 ${errors.phone ? "border-red-500" : ""}`} />
                        </div>
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>

                    <button disabled={isProcessing}
                        type="submit"
                        className={`flex gap-1 items-center justify-center w-full bg-gray-900 text-white py-2.5 rounded font-medium text-lg hover:bg-gray-800 transition-all duration-200 hover:cursor-pointer  ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {isProcessing && (
                            <svg
                                className="animate-spin h-5 w-5 text-white"
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
                        )}
                        Đăng ký
                    </button>

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Đã có tài khoản?{" "}
                        <Link to="/login" className="text-blue-600 font-medium hover:underline">
                            Đăng nhập
                        </Link>
                    </p>
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
                    />
                )}
            </div></>
    );
}
