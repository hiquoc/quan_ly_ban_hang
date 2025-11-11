import { useState, useEffect } from "react";
import { requestVerificationCode, requestVerificationCodeSecure, checkVerificationCode, checkVerificationCodeSecure } from "../apis/authApi";

export default function VerificationSection({ email, setEmail, onVerified, showPopup, onClose, secure = false, title = "Xác thực Email",completeTitle="Xác thực thành công! Đang đăng ký..." }) {
    const [sendingCode, setSendingCode] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [verifyCodeValue, setVerifyCodeValue] = useState("");
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    useEffect(() => {
        if (verifyCodeValue.length === 6) handleVerifyCode();
    }, [verifyCodeValue]);

    const handleSendVerification = async () => {
        if (!email.trim()) return showPopup("Vui lòng nhập email!");
        setSendingCode(true);
        let res;
        if (!secure)
            res = await requestVerificationCode(email);
        else
            res = await requestVerificationCodeSecure(email);
        setSendingCode(false);

        if (res.error) {
            setVerificationSent(false);
            return showPopup(res.error);
        }

        setVerificationSent(true);
        setResendCooldown(30);
        setVerifyCodeValue("");
        setVerificationSuccess(false);
    };

    const handleVerifyCode = async () => {
        if (verifyCodeValue.length !== 6) return;
        setVerifying(true);
        let res;
        if (!secure)
            res = await checkVerificationCode(email, verifyCodeValue);
        else
            res = await checkVerificationCodeSecure(email, verifyCodeValue);
        setVerifying(false);

        if (res.error) {
            setVerifyCodeValue("");
            return showPopup(res.error);
        }

        setVerificationSuccess(true);
        showPopup("Xác thực thành công!", "success");

        setTimeout(() => {
            onVerified(true);
            onClose?.();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="relative bg-white px-10 py-8 rounded shadow-2xl w-full max-w-[28rem] mx-4 flex flex-col  space-y-4">
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold transition"
                    onClick={onClose}
                >
                    ×
                </button>

                <h2 className="text-2xl font-bold text-gray-800 text-center whitespace-pre-line">
                    {title}
                </h2>
                <p className="text-gray-600 text-left text-sm mb-2">
                    Nhập email để nhận mã xác thực
                </p>

                <input
                    type="email"
                    className="w-full px-5 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800 text-lg"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setVerificationSent(false);
                        setVerificationSuccess(false);
                        setVerifyCodeValue("");
                    }}
                />

                <button
                    onClick={handleSendVerification}
                    disabled={!email || sendingCode || resendCooldown > 0}
                    className="w-full px-5 py-3 bg-black text-white font-semibold rounded hover:bg-gray-900 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-lg flex justify-center items-center space-x-2 hover:cursor-pointer"
                >
                    {sendingCode && <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>
                        {sendingCode
                            ? "Đang gửi..."
                            : resendCooldown > 0
                                ? `Gửi lại (${resendCooldown}s)`
                                : "Gửi mã"}
                    </span>
                </button>

                {verificationSent && !verificationSuccess && (
                    <p className="text-gray-700 text-center w-full break-words text-sm">
                        Mã đã được gửi đến email <span className="font-semibold">{email}</span>
                    </p>
                )}

                {verificationSent && !verificationSuccess && (
                    <input
                        type="text"
                        maxLength={6}
                        className="w-full px-5 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800 text-center text-lg"
                        placeholder="Nhập mã xác nhận (6 ký tự)"
                        value={verifyCodeValue}
                        onChange={(e) => setVerifyCodeValue(e.target.value)}
                        disabled={verifying}
                    />
                )}

                {verificationSuccess && (
                    <div className="flex items-center justify-center w-full space-x-3 mt-2">
                        <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-green-600 font-bold text-center text-base">
                            {completeTitle}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
