import api, { safeApiCall } from "./api";

export const validatePromotionCode = (code, orderAmount, productIds, categoryIds, brandIds) =>
    safeApiCall(() => api.post(`promotions/validate`, { code, orderAmount, productIds, categoryIds, brandIds }))

export const getAllPromotions = (page, size, keyword, active) => {
    const params = {}
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;
    if (active) params.active = active;
    // if (startDate) params.startDate = startDate;
    // if (endDate) params.endDate = endDate;
    return safeApiCall(() => api.get(`promotions`, { params }))
}

export const createPromotion = async (data) =>
    safeApiCall(() => api.post(
        `promotions`, data))
