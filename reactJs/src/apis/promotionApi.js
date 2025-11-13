import api, { safeApiCall } from "./api";

export const validatePromotionCode = (code, orderAmount, productIds, categoryIds, brandIds) =>
    safeApiCall(() => api.post(`promotions/validate`, { code, orderAmount, productIds, categoryIds, brandIds }))

export const getAllPromotions = (page, size, keyword, isActive) => {
    const params = {}
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;
    if (isActive != null) params.isActive = isActive;
    // if (startDate) params.startDate = startDate;
    // if (endDate) params.endDate = endDate;
    return safeApiCall(() => api.get(`promotions`, { params }))
}

export const getActivePromotions = async () =>
    safeApiCall(() => api.get(
        `promotions/active`))

export const createPromotion = async (data) =>
    safeApiCall(() => api.post(
        `promotions`, data))
export const updatePromotion = async (id, data) =>
    safeApiCall(() => api.put(
        `promotions/${id}`, data))
export const updatePromotionActive = async (id) =>
    safeApiCall(() => api.patch(
        `promotions/${id}`))
export const deletePromotion = async (id) =>
    safeApiCall(() => api.delete(
        `promotions/${id}`))

export const getPromotionById = async (id) =>
    safeApiCall(() => api.get(`/promotions/${id}`))