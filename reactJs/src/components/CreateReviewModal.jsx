import { useState } from "react";
import { FiCamera, FiTrash, FiUpload, FiX } from "react-icons/fi";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import { createProductReview } from "../apis/productApi";

export default function CreateReviewModal({ isOpen, onClose, onSuccess, showPopup, reviewingProduct }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [content, setContent] = useState("");
    const [images, setImages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false)
    const [showImageModal, setShowImageModal] = useState({ visible: false, imageUrl: null })
    const handleReviewImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f), isDeleted: false }))]);
    };

    const handleRemoveImage = (idx) => {
        setImages(prev => prev.map((img, i) => i === idx ? { ...img, isDeleted: true } : img));
    };

    const handleSubmit = async () => {
        try {
            setIsProcessing(true)
            const filteredImages = (images || []).filter(img => !img.isDeleted).map(i => i.file);
            const res = await createProductReview(
                reviewingProduct.orderId,
                reviewingProduct.variantId,
                rating,
                content,
                filteredImages
            );
            if (res.error) return showPopup(res.error);

            showPopup("Cảm ơn bạn đã để lại đánh giá!");
            setRating(0);
            setContent("");
            setImages([]);
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } finally {
            setIsProcessing(false)
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pb-10">
            <div className="bg-white w-[500px] rounded-lg p-6 relative">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-black">
                    <FiX size={20} />
                </button>

                <h2 className="text-lg font-semibold mb-4">Đánh giá sản phẩm: {reviewingProduct.variantName}</h2>
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
                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="font-medium">Đánh giá:</span>
                    {[1, 2, 3, 4, 5].map(i => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setRating(i)}
                            onMouseEnter={() => setHoverRating(i)}
                            onMouseLeave={() => setHoverRating(0)}
                        >
                            {i <= (hoverRating || rating) ? (
                                <AiFillStar className="text-yellow-400 text-2xl" />
                            ) : (
                                <AiOutlineStar className="text-gray-400 text-2xl hover:text-yellow-300" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <textarea
                    placeholder="Nội dung đánh giá"
                    className="w-full border border-gray-300 rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-gray-800 mb-4"
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                />
                <label className="block font-medium mb-1">Hình ảnh sản phẩm (tùy chọn)</label>

                <div className="mb-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-100">
                        <FiUpload />
                        Tải ảnh lên
                        <input type="file" multiple hidden accept="image/*" onChange={handleReviewImageChange} />
                    </label>
                </div>

                {/* Images */}

                {images.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                        {images.map((img, idx) => !img.isDeleted && (
                            <div key={idx} className="relative">
                                <img src={img.url}
                                    alt={`preview-${idx}`} className="w-20 h-20 object-cover border border-gray-300 rounded"
                                    onClick={() => setShowImageModal({ visible: true, imageUrl: img.url })}                                />
                                <button
                                    onClick={() => handleRemoveImage(idx)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full text-xs hover:bg-red-600"
                                >
                                    <FiTrash />
                                </button>
                            </div>
                        ))}
                    </div>
                )}


                {/* Action buttons */}
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded border border-gray-400 hover:bg-gray-100 text-gray-700"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 flex items-center gap-2"
                    >
                        Gửi đánh giá
                    </button>
                </div>
            </div>
            {showImageModal && showImageModal.imageUrl && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]"
                    onClick={() => setShowImageModal({ visible: false, imageUrl: null })}
                >
                    <button
                        onClick={() => setShowImageModal({ visible: false, imageUrl: null })}
                        className="p-2 hover:bg-white/20 text-white rounded-full transition absolute top-4 right-4"
                    >
                        <FiX className="w-6 h-6" />
                    </button>

                    {/* Modal Content */}
                    <div
                        className="rounded-lg shadow-xl max-w-[90%] max-h-[90%] overflow-hidden relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={showImageModal.imageUrl}
                            alt="Ảnh đánh giá"
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
