import React from "react";

export default function ConfirmPanel({ message, onConfirm, onCancel }) {
    if (!message) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
            ></div>

            <div className="relative bg-white p-6 rounded-xl shadow-2xl w-96 max-w-sm text-center">
                <button
                    className="absolute top-2 right-3 font-bold text-xl"
                    onClick={onCancel}
                >
                    ×
                </button>

                <p className="text-xl mt-5 mb-5 text-gray-800">
                    {message}
                </p>

                <div className="flex justify-center gap-4 mt-4">
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition"
                    >
                        Xác nhận
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 bg-gray-300 text-gray-800 rounded-full font-semibold hover:bg-gray-400 transition"
                    >
                        Hủy
                    </button>
                </div>
            </div>
        </div>
    );
}
