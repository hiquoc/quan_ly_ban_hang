import React from "react";

export default function ConfirmPanel({ message, onConfirm, onCancel }) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  async function handleConfirm() {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  }
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
        {isProcessing && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded pointer-events-auto">
            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg flex items-center gap-2 shadow-lg border border-gray-200">
              <svg
                className="animate-spin h-5 w-5 text-gray-700"
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
              <span className="text-gray-700 font-medium">Đang xử lý...</span>
            </div>
          </div>
        )}

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
            onClick={() => handleConfirm()}
            className="px-5 py-2 bg-black text-white rounded font-semibold hover:bg-gray-800 transition hover:cursor-pointer"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
