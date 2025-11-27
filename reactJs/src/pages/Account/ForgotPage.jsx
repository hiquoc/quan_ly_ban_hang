import React, { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiX, FiUser, FiLock } from "react-icons/fi";
import { PopupContext } from "../../contexts/PopupContext";
import { changePasswordByForgotCode, requestForgotPasswordCode } from "../../apis/authApi";
import { Helmet } from "react-helmet-async";

export default function ForgotPage() {
    const navigate = useNavigate();
    const { showPopup } = useContext(PopupContext);

    // Form states
    const [step, setStep] = useState(1); // 1: username, 2: verification & password
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [verifyCode, setVerifyCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Cooldown timer
    React.useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Step 1: Verify username and send code
    const handleSendCode = async (e) => {
        e.preventDefault();
        if (isProcessing || sendingCode) return;

        const newErrors = {};
        if (!username.trim()) newErrors.username = "Vui lòng nhập tên tài khoản.";
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSendingCode(true);
        try {
            const res = await requestForgotPasswordCode(username);
            if (res.error) {
                showPopup(res.error);
                return;
            }

            // Get email from response
            if (res.data) {
                setEmail(res.data);
            }

            setStep(2);
            setResendCooldown(30);
        } finally {
            setSendingCode(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) return;
        
        setSendingCode(true);
        try {
            const res = await requestForgotPasswordCode(username);
            if (res.error) {
                showPopup(res.error);
                return;
            }

            setResendCooldown(30);
            setVerifyCode("");
        } finally {
            setSendingCode(false);
        }
    };

    // Step 2: Reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (isProcessing) return;

        const newErrors = {};
        if (!verifyCode.trim() || verifyCode.length !== 6) newErrors.verifyCode = "Vui lòng nhập mã xác thực 6 ký tự.";
        if (!newPassword) newErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
        else if (newPassword.length < 6) newErrors.newPassword = "Mật khẩu phải có ít nhất 6 ký tự.";
        if (confirmPassword !== newPassword) newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsProcessing(true);
        try {
            const res = await changePasswordByForgotCode(username, verifyCode, newPassword);
            if (res.error) {
                showPopup(res.error);
                return;
            }

            showPopup("Đặt lại mật khẩu thành công! Vui lòng đăng nhập.", "success", () => navigate(`/login`));
            setTimeout(() => navigate("/login"), 2000);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Quên mật khẩu</title>
            </Helmet>

            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
                <form 
                    onSubmit={step === 1 ? handleSendCode : handleResetPassword}
                    className="bg-white p-10 rounded-2xl shadow-2xl w-[420px] relative transition-all duration-300 hover:shadow-3xl border border-gray-100"
                >
                    <button 
                        type="button" 
                        onClick={() => navigate("/login")} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl transition-all duration-200 hover:rotate-90"
                    >
                        <FiX />
                    </button>

                    <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">
                        Quên mật khẩu
                    </h2>
                    <p className="text-center text-sm text-gray-600 mb-8">
                        {step === 1 ? "Nhập thông tin để lấy lại mật khẩu" : "Nhập mã xác thực và mật khẩu mới"}
                    </p>

                    {step === 1 ? (
                        <>
                            {/* Username */}
                            <div className="mb-6">
                                <div className="relative flex items-center">
                                    <FiUser className="absolute left-3 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Tên tài khoản"
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setErrors({...errors, username: ""});
                                        }}
                                        className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white ${errors.username ? "border-red-500 ring-2 ring-red-200" : ""}`}
                                    />
                                </div>
                                {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                            </div>

                            <button 
                                type="submit"
                                disabled={sendingCode}
                                className={`flex gap-2 items-center justify-center w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-base hover:bg-gray-800 transition-all duration-200 hover:cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${sendingCode ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {sendingCode && (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                )}
                                Gửi mã xác thực
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Email display */}
                            {email && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-600 text-center">
                                        Mã xác nhận đã được gửi đến email: <span className="font-semibold text-gray-900">{email}</span>
                                    </p>
                                </div>
                            )}

                            {/* Verification Code */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="Nhập mã xác thực (6 ký tự)"
                                    value={verifyCode}
                                    onChange={(e) => {
                                        setVerifyCode(e.target.value.replace(/\D/g, ''));
                                        setErrors({...errors, verifyCode: ""});
                                    }}
                                    className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white text-center tracking-widest text-lg ${errors.verifyCode ? "border-red-500 ring-2 ring-red-200" : ""}`}
                                />
                                {errors.verifyCode && <p className="text-red-500 text-sm mt-1">{errors.verifyCode}</p>}
                            </div>

                            {/* Resend Code */}
                            <div className="mb-4 text-center">
                                <button
                                    type="button"
                                    onClick={handleResendCode}
                                    disabled={resendCooldown > 0 || sendingCode}
                                    className="text-sm text-gray-700 hover:text-gray-900 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                                >
                                    {resendCooldown > 0 ? `Gửi lại mã (${resendCooldown}s)` : "Gửi lại mã"}
                                </button>
                            </div>

                            {/* New Password */}
                            <div className="mb-4">
                                <div className="relative flex items-center">
                                    <FiLock className="absolute left-3 text-gray-400 pointer-events-none" />
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu mới"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setErrors({...errors, newPassword: ""});
                                        }}
                                        className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white ${errors.newPassword ? "border-red-500 ring-2 ring-red-200" : ""}`}
                                    />
                                </div>
                                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
                            </div>

                            {/* Confirm Password */}
                            <div className="mb-6">
                                <div className="relative flex items-center">
                                    <FiLock className="absolute left-3 text-gray-400 pointer-events-none" />
                                    <input
                                        type="password"
                                        placeholder="Xác nhận mật khẩu mới"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setErrors({...errors, confirmPassword: ""});
                                        }}
                                        className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white ${errors.confirmPassword ? "border-red-500 ring-2 ring-red-200" : ""}`}
                                    />
                                </div>
                                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                            </div>

                            <button 
                                type="submit"
                                disabled={isProcessing}
                                className={`flex gap-2 items-center justify-center w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-base hover:bg-gray-800 transition-all duration-200 hover:cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {isProcessing && (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                )}
                                Đặt lại mật khẩu
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setVerifyCode("");
                                    setNewPassword("");
                                    setConfirmPassword("");
                                    setErrors({});
                                }}
                                className="w-full mt-3 text-sm text-gray-600 hover:text-gray-900 hover:underline"
                            >
                                ← Quay lại
                            </button>
                        </>
                    )}

                    <p className="mt-6 text-center text-sm text-gray-600">
                        Đã nhớ mật khẩu?{" "}
                        <Link to="/login" className="text-gray-900 font-semibold hover:text-gray-700 hover:underline">
                            Đăng nhập
                        </Link>
                    </p>
                </form>
            </div>
        </>
    );
}