import React from "react";

export default function ConfirmPanel({ message, onConfirm, onCancel }) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-52 pb-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      ></div>

      {/* Panel */}
      <div className="relative bg-white p-6 rounded shadow-xl max-w-lg w-full mx-4">
        {/* Close button */}
        <button
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl font-bold transition hover:cursor-pointer"
          onClick={onCancel}
        >
          ×
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Xác nhận</h2>

        {/* Message */}
        <p className="text-gray-700 text-left mb-6 whitespace-pre-wrap break-words">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3 flex-wrap">
          <button
            onClick={onCancel}
            className="px-5 py-2 border border-gray-400 rounded font-semibold hover:bg-gray-100 transition hover:cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-black text-white rounded font-semibold hover:bg-gray-800 transition hover:cursor-pointer"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
