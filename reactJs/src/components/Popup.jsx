import React, { useEffect } from "react";

export default function Popup({ message, onClose, duration = 4000, type = "error" }) {
    useEffect(() => {
        if (!message) return;

        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [message, duration, onClose]);

    if (!message) return null;

    const typeStyles = {
        success: "text-green-600",
        error: "text-red-600",
        warning: "text-yellow-600",
        info: "text-blue-600",
    };


    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            ></div>
            <div
                className={`relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center`}>
                <p className={`text-xl mt-5 mb-5 ${typeStyles[type] || typeStyles.error}`}
                    style={{ whiteSpace: "pre-line" }}
                >
                    {message}
                </p>
                <button
                    className="absolute top-2 right-3 font-bold text-xl"
                    onClick={onClose}>
                    ×</button>
                <button
                    onClick={onClose}
                    className="px-6 py-2 mt-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition">
                    Xác nhận
                </button>
            </div>
        </div>
    );
}

