import { useState } from "react";
import { FiX, FiTrash, FiUpload, FiMinus, FiPlus } from "react-icons/fi";
import { createReturnOrder } from "../apis/orderApi";

export default function ReturnOrderModal({ order, show, showPopup, onClose, onSubmit }) {
    const [selectedItems, setSelectedItems] = useState([]); // list of { variantId, quantity, max }
    const [reason, setReason] = useState("");
    const [images, setImages] = useState([]);
    const [bankInfo, setBankInfo] = useState({ bankName: "", accountNumber: "", accountHolder: "" });
    if (!show) return null;
    const banks = [
        { code: "VCB", name: "Vietcombank" },
        { code: "BIDV", name: "BIDV" },
        { code: "VIB", name: "VIB" },
        { code: "ACB", name: "ACB" },
        { code: "TPB", name: "TPBank" },
        { code: "MB", name: "Military Bank" },
        { code: "SHB", name: "SHB" },
        { code: "VPB", name: "VPBank" },
        { code: "AGR", name: "Agribank" },
        { code: "Techcombank", name: "Techcombank" },
        // ... add other banks
    ];


    const toggleItem = (item) => {
        const exists = selectedItems.find(i => i.variantId === item.variantId);
        if (exists) {
            setSelectedItems(prev => prev.filter(i => i.variantId !== item.variantId));
        } else {
            setSelectedItems(prev => [...prev, { variantId: item.variantId, quantity: 1, max: item.quantity }]);
        }
    };

    const changeQuantity = (variantId, delta) => {
        setSelectedItems(prev => prev.map(i => {
            if (i.variantId !== variantId) return i;
            const newQty = Math.min(Math.max(i.quantity + delta, 1), i.max);
            return { ...i, quantity: newQty };
        }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages(prev => [...prev, ...files]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) return showPopup("Vui lòng chọn ít nhất 1 sản phẩm để trả");
        if (!reason.trim()) return showPopup("Vui lòng nhập lý do trả hàng");
        if (!bankInfo.bankName.trim() || !bankInfo.accountNumber.trim() || !bankInfo.accountHolder.trim()) {
            return showPopup("Vui lòng điền đầy đủ thông tin ngân hàng để nhận tiền hoàn trả");
        }
        // send only variantId and quantity
        const itemsToSend = selectedItems.map(({ variantId, quantity }) => ({ variantId, quantity }));

        const res = await createReturnOrder(order.id, reason, itemsToSend, images);
        if (res.error) return showPopup(res.error);

        showPopup("Đã gửi yêu cầu trả hàng! Vui lòng đợi trong khi chúng tôi đưa nhân viên nhận hàng đến nhà bạn.");
        setSelectedItems([]);
        setReason("");
        setImages([]);
        onSubmit();
    };

    const getItemQuantity = (variantId) => selectedItems.find(i => i.variantId === variantId)?.quantity || 0;
    const isSelected = (variantId) => selectedItems.some(i => i.variantId === variantId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pb-10">
            <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-lg p-6">

                {/* HEADER */}
                <div className="flex justify-between mb-4">
                    <h2 className="text-lg font-semibold">Trả hàng / Hoàn tiền</h2>
                    <FiX onClick={onClose} className="text-2xl cursor-pointer hover:text-gray-700" />
                </div>

                {/* ITEM LIST */}
                <div className="mb-4 max-h-64 overflow-y-auto border rounded p-3">
                    {order.items.map(item => {
                        const selected = isSelected(item.variantId);
                        const quantity = getItemQuantity(item.variantId);
                        return (
                            <div key={item.id} className="flex justify-between items-center py-2">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleItem(item)}>
                                    <div className={`w-5 h-5 flex justify-center items-center rounded border transition 
                                        ${selected ? "bg-black border-black text-white" : "border-gray-400"}`}>
                                        {selected && "✔"}
                                    </div>
                                    <img src={item.imageUrl} className="w-10 h-10 object-cover" alt={item.id} />
                                    <span className="text-sm max-w-60">{item.variantName || `Sản phẩm ${item.id}`}</span>
                                </div>

                                {selected && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => changeQuantity(item.variantId, -1)}
                                            disabled={quantity <= 1}
                                            className={`p-1 rounded ${quantity <= 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                                        >
                                            <FiMinus size={16} />
                                        </button>
                                        <span className="w-10 text-center font-semibold">{quantity}</span>
                                        <button
                                            onClick={() => changeQuantity(item.variantId, 1)}
                                            disabled={quantity >= item.quantity}
                                            className={`p-1 rounded ${quantity >= item.quantity ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"}`}
                                        >
                                            <FiPlus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* REASON */}
                <label className="block mb-1 font-medium">Lý do trả hàng</label>
                <textarea
                    className="w-full border border-gray-300 rounded p-2 resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-gray-800"
                    rows={4}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Nhập lý do trả hàng..."
                />
                <div className="mb-4">
                    <label className="block mb-1 font-medium">Ngân hàng</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={bankInfo.bankCode}
                        onChange={e => setBankInfo({ ...bankInfo, bankCode: e.target.value })}
                        required
                    >
                        <option value="">Chọn ngân hàng</option>
                        {banks.map(bank => (
                            <option key={bank.code} value={bank.code}>{bank.name}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block mb-1 font-medium">Số tài khoản</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={bankInfo.accountNumber}
                        onChange={e => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                        placeholder="Nhập số tài khoản"
                        maxLength={14}
                        pattern="\d{6,14}"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="block mb-1 font-medium">Tên chủ tài khoản</label>
                    <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md p-2"
                        value={bankInfo.accountHolder}
                        onChange={e => setBankInfo({ ...bankInfo, accountHolder: e.target.value })}
                        placeholder="Nhập tên chủ tài khoản"
                        required
                    />
                </div>

                {/* IMAGE UPLOAD */}
                <label className="block font-medium mb-1">Hình ảnh sản phẩm (tùy chọn)</label>
                <div className="mb-3">
                    <label className="flex items-center justify-center gap-2 px-4 py-2 border rounded cursor-pointer hover:bg-gray-100">
                        <FiUpload />
                        Tải ảnh lên
                        <input type="file" multiple hidden accept="image/*" onChange={handleImageChange} />
                    </label>
                </div>

                {/* IMAGE PREVIEW */}
                {images.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                        {images.map((img, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={URL.createObjectURL(img)}
                                    alt="preview"
                                    className="w-20 h-20 object-cover rounded border"
                                />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full text-xs hover:bg-red-600"
                                >
                                    <FiTrash />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ACTIONS */}
                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                        onClick={() => { setSelectedItems([]); setReason(""); setImages([]); onClose(); }}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-5 py-2 bg-black text-white rounded hover:bg-gray-900"
                    >
                        Gửi yêu cầu
                    </button>
                </div>
            </div>
        </div>
    );
}
