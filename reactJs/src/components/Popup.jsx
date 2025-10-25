import React from "react";

export default function Popup({ message, onClose, type = "error" }) {
    if (!message) return null;

    const typeStyles = {
        success: "text-gray-800",
        error: "text-gray-800",
        warning: "text-gray-800",
        info: "text-gray-800",
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 pb-20">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className="relative bg-white p-6 rounded shadow-xl max-w-md w-full mx-4 text-left">
                {/* Close button */}
                <button
                    className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold transition hover:cursor-pointer"
                    onClick={onClose}
                >
                    ×
                </button>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Thông báo</h2>
                {/* Message */}
                <p
                    className={`px-5 text-gray-800 text-lg whitespace-pre-wrap break-words`}
                >
                    {message} 
                </p>

                {/* Confirm button */}
                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-black text-white rounded font-semibold hover:bg-gray-900 hover:cursor-pointer transition"
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}
