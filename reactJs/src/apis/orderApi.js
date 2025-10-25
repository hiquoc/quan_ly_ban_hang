import api, { safeApiCall } from "./api";

export const createOrder = async ({ items,
    shippingName,
    shippingAddress,
    shippingPhone,
    paymentMethod,
    promotionCode,
    notes,
    clearCart
}) =>
    safeApiCall(() => api.post(
        `orders/checkout`, {
        items, shippingName, shippingAddress,
        shippingPhone, paymentMethod,
        promotionCode, notes, clearCart
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
export const getAllOrders = async (page, size, status, keyword, startDate, endDate) => {
    const params = {}
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

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
