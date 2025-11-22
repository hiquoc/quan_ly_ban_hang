import React, { useState, useEffect } from "react";
import { getCustomerDetails } from "../../../apis/customerApi";
import { getCustomerOrderStats } from "../../../apis/orderApi";
import { getStaffDetails } from "../../../apis/staffApi";

function AccountDetails({ customerId, staffId, onClose }) {
  const [customer, setCustomer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const isStaff = !!staffId;

  useEffect(() => {
    if (!customerId && !staffId) return;

    const fetchCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        let response;
        if (!isStaff) response = await getCustomerDetails(customerId);
        else response = await getStaffDetails(staffId);

        if (response?.error) {
          setError(response.error);
          setCustomer(null);
        } else {
          setCustomer(response.data);
          if (response.data.addresses?.length > 0) setSelectedAddress(response.data.addresses[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchOrderData = async () => {
      if (isStaff) return;
      const res = await getCustomerOrderStats();
      if (res.error) setError(res.error);
      else {
        setStats(res.data);
      }
    };

    fetchCustomer();
    fetchOrderData();
  }, [customerId, staffId, isStaff]);

  const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString("vi-VN") : "-");
  const formatDateTime = (dateStr) => (dateStr ? new Date(dateStr).toLocaleString("vi-VN") : "-");
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "-";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(value);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-800"></div>
            <span className="text-gray-700 text-sm">Đang tải...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-md mx-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">
            {isStaff ? "Thông tin nhân viên" : "Thông tin khách hàng"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto">
          {isStaff ? (
            // Staff View
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ID</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {customer.id || "-"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {customer.fullName || "-"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {customer.email || "-"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Số điện thoại</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {customer.phone || "-"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ngày tạo</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {formatDateTime(customer.createdAt)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cập nhật lần cuối</label>
                <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                  {formatDateTime(customer.updatedAt)}
                </div>
              </div>
            </div>
          ) : (
            // Customer View
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Thông tin cá nhân
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {customer.id || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {customer.fullName || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {customer.email || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Số điện thoại</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {customer.phone || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ngày sinh</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {formatDate(customer.dateOfBirth)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Giới tính</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {customer.gender === null ? "-" : customer.gender === "MALE" ? "Nam" : "Nữ"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Statistics */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Thống kê đơn hàng
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tổng đơn hàng</label>
                      <div className="text-lg font-semibold text-gray-900">{stats?.totalOrders ?? 0}</div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Trung bình/đơn</label>
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(stats?.averageOrderValue)}</div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition">
                    <div className="p-3 bg-green-50 text-green-600 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tổng chi tiêu</label>
                      <div className="text-lg font-semibold text-gray-900">{formatCurrency(stats?.totalSpent)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Địa chỉ giao hàng
                </h4>
                {customer.addresses?.length > 0 ? (
                  <div className="space-y-3">
                    <select
                      className="w-full text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      value={selectedAddress ? JSON.stringify(selectedAddress) : ""}
                      onChange={(e) => setSelectedAddress(JSON.parse(e.target.value))}
                    >
                      {customer.addresses.map((addr, idx) => (
                        <option key={idx} value={JSON.stringify(addr)}>
                          {addr.street}, {addr.ward}, {addr.district}, {addr.city} {addr.isMain ? "(Mặc định)" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedAddress && (
                      <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
                        <p className="text-sm text-gray-900">
                          {selectedAddress.street}, {selectedAddress.ward}, {selectedAddress.district}, {selectedAddress.city}
                          {selectedAddress.isMain && (
                            <span className="ml-2 text-xs bg-gray-900 text-white px-2 py-0.5 rounded">Mặc định</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    Chưa có địa chỉ
                  </div>
                )}
              </div>

              {/* System Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Thông tin hệ thống
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ngày tạo</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {formatDateTime(customer.createdAt)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cập nhật lần cuối</label>
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {formatDateTime(customer.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountDetails;