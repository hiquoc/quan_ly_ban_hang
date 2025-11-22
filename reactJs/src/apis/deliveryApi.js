import api, { safeApiCall } from "./api";

export const getAllShippers = async (page, size, keyword, status, warehouseId, active) => {
    const params = {};
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;
    if (status) params.status = status;
    if (warehouseId) params.warehouseId = warehouseId;
    if (active!=null) params.active = active;

    return safeApiCall(() => api.get(`deliveries/secure/shippers`, { params }))
}

export const getAllShippersDetails = async (page, size, keyword, status, warehouseId, active) => {
    const params = {};
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;
    if (status) params.status = status;
    if (warehouseId) params.warehouseId = warehouseId;
    if (active!=null) params.active = active;

    return safeApiCall(() => api.get(`deliveries/secure/shippers-details`, { params }))
}

export const getShipperDetails = async (id) =>
    safeApiCall(() => api.get(`deliveries/secure/shippers/${id}`))

export const updateShipperDetails = async (id, fullName, phone, email) =>
    safeApiCall(() => api.put(`deliveries/secure/shippers/${id}`, { fullName, phone, email }))

export const changeShipperWarehouse = async (id, warehouseId) =>
    safeApiCall(() => api.patch(`deliveries/secure/shippers/${id}/warehouse/${warehouseId}`))
export const changeShipperActive = async (id) =>
    safeApiCall(() => api.patch(`deliveries/secure/shippers/${id}/active`))


export const getAllDeliveries = async (page, size, keyword, status, warehouseId) => {
    const params = {};
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;
    if (status) params.status = status;
    if (warehouseId) params.warehouseId = warehouseId;
    return safeApiCall(() => api.get(`deliveries/secure/deliveries`, { params }))
}

export const assignDeliveriesToShipper = async (shipperId, deliveryIds) => {
    return safeApiCall(() => api.post(`deliveries/secure/deliveries`, { shipperId, deliveryIds }))
}
