import api, { safeApiCall } from "./api";

export const createOrder = async ({ items,
    shippingName,
    shippingAddress,
    shippingPhone,
    paymentMethod,
    promotionCode,
    notes,
    clearCart,
    platform = "web"
}) =>
    safeApiCall(() => api.post(
        `orders/checkout`, {
        items, shippingName, shippingAddress,
        shippingPhone, paymentMethod,
        promotionCode, notes, clearCart, platform
    }))

export const cancelOrder = async (orderId, reason) => {
    return safeApiCall(() =>
        api.post(`/orders/${orderId}/cancel`, { reason })
    );
};

export const getCustomerOrders = async (page, size, statusName) => {
    const params = {}
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (statusName) params.statusName = statusName;

    return safeApiCall(() => api.get(`orders/customer`, { params }))
}
export const getAllOrders = async (page, size, status, keyword, startDate, endDate,warehouseId,sortByDeliveredDate) => {
    const params = {}
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (warehouseId) params.warehouseId = warehouseId;
    if (sortByDeliveredDate) params.sortByDeliveredDate = sortByDeliveredDate;

    return safeApiCall(() => api.get(`orders/secure/orders`, { params }))
}
export const getOrderDetails = async (orderNumber) => {
    return safeApiCall(() =>
        api.get(`/orders/number/${orderNumber}`)
    );
};

export const updateOrderStatus = async (orderId, statusId, notes = "") => {
    const request = { statusId, notes };
    return safeApiCall(() => api.patch(`/orders/${orderId}/status`, request));
};

export const getCustomerOrderStats = async () =>
    safeApiCall(() => api.get(`/orders/customer/statistics`))

export const rePayPayment = async (id) =>
    safeApiCall(() => api.post(`/payments/re-pay/order/${id}/platform/web`))

export const getOrderDashboard = async (start, end) => {
    const params = new URLSearchParams();
    // const fromLocal = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
    // const toLocal = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);

    params.append("start",start);
    params.append("end", end);

    return safeApiCall(() => api.get(`/orders/secure/dashboard?${params.toString()}`))
}

export const createReturnOrder = async (orderId, reason, items, images) => {
    const formData = new FormData();
    const returnOrderData = { orderId, reason, items };

    formData.append(
        "return",
        new Blob([JSON.stringify(returnOrderData)], { type: "application/json" })
    );

    images.forEach(img => {
        formData.append("images", img);
    });

    return safeApiCall(() =>
        api.post(`orders/return`, formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        })
    );
}

export const changeAddressForOrder = async (orderId,name,phone, address) => {
    return safeApiCall(() =>
        api.post(`/orders/${orderId}/address`, { name,phone,address })
    );
}