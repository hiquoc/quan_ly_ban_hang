import React, { useState, useEffect } from "react";
import { getCustomerDetails } from "../apis/customerApi";

function CustomerDetails({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  useEffect(() => {
    if (!customerId) return;

    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getCustomerDetails(customerId);
        if (response?.error) {
          setError(response.error);
          setCustomer(null);
        } else {
          setCustomer(response.data);
          if (response.data.addresses?.length > 0) {
            setSelectedAddress(response.data.addresses[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch customer:", err);
        setError("Failed to load customer details.");
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString() : "-");
  const formatDateTime = (dateStr) => (dateStr ? new Date(dateStr).toLocaleString() : "-");

  if (loading) return <div className="p-4 text-center text-gray-700">Loading customer details...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!customer) return null;

  const inputClass = "border  rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "font-semibold  text-sm";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      ></div>
      <div className="relative p-6 bg-white rounded-xl shadow-lg w-full max-w-4xl mx-auto"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-semibold mb-4 text-blue-800">Thông tin khách hàng</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>ID:</label>
            <input className={inputClass} value={customer.id || "-"} readOnly />

            <label className={labelClass}>Họ và tên:</label>
            <input className={inputClass} value={customer.fullName || "-"} readOnly />

            <label className={labelClass}>Email:</label>
            <input className={inputClass} value={customer.email || "-"} readOnly />

            <label className={labelClass}>Số điện thoại:</label>
            <input className={inputClass} value={customer.phone || "-"} readOnly />

            <label className={labelClass}>Ngày sinh:</label>
            <input className={inputClass} value={formatDate(customer.dateOfBirth)} readOnly />

            <label className={labelClass}>Giới tính:</label>
            <input className={inputClass} value={customer.gender || "-"} readOnly />

            <label className={labelClass}>Phân đoạn:</label>
            <input className={inputClass} value={customer.segmentName || "-"} readOnly />

            <label className={labelClass}>Tổng chi tiêu:</label>
            <input className={inputClass} value={customer.totalSpent ?? "-"} readOnly />
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-2">
            <label className={labelClass}>Tổng đơn hàng:</label>
            <input className={inputClass} value={customer.totalOrders ?? 0} readOnly />

            <label className={labelClass}>Đơn hàng gần nhất:</label>
            <input className={inputClass} value={formatDateTime(customer.lastOrderDate)} readOnly />

            <label className={labelClass}>Sở thích:</label>
            <input className={inputClass} value={customer.preferences || "-"} readOnly />

            <label className={labelClass}>Tags:</label>
            <input className={inputClass} value={customer.tags || "-"} readOnly />

            <label className={labelClass}>Ngày tạo:</label>
            <input className={inputClass} value={formatDateTime(customer.createdAt)} readOnly />

            <label className={labelClass}>Cập nhật lần cuối:</label>
            <input className={inputClass} value={formatDateTime(customer.updatedAt)} readOnly />

            <label className={labelClass}>Địa chỉ:</label>
            {customer.addresses?.length > 0 ? (
              <select
                className={inputClass}
                value={selectedAddress ? JSON.stringify(selectedAddress) : ""}
                onChange={(e) => setSelectedAddress(JSON.parse(e.target.value))}
              >
                {customer.addresses.map((addr, idx) => (
                  <option key={idx} value={JSON.stringify(addr)}>
                    {addr.street}, {addr.ward}, {addr.district}, {addr.city}, {addr.isMain}
                  </option>
                ))}
              </select>
            ) : (
              <input className={inputClass} value="-" readOnly />
            )}

            {selectedAddress && (
              <textarea
                className={inputClass + " mt-1 resize-none"}
                rows={2}
                readOnly
                value={`${selectedAddress.street}, ${selectedAddress.ward}, ${selectedAddress.district}, ${selectedAddress.city}, ${selectedAddress.isMain}`}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetails;
