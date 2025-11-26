import api, { safeApiCall } from "./api";

export const getAllStaffs = (page, size, keyword, warehouseId, active) => {
  const params = {};
  if (page != null) params.page = page;
  if (size != null) params.size = size;
  if (keyword) params.keyword = keyword;
  if (warehouseId) params.warehouseId = warehouseId;
  if (active != null) params.active = active;

  return safeApiCall(() => api.get("staff/secure/staffs",{params}));
}

export const getStaffDetails = (id) =>
  safeApiCall(() => api.get(`staff/secure/staffs/${id}`))

export const updateStaffDetails = (id, fullName, phone, email) =>
  safeApiCall(() => api.put(`staff/secure/staffs/${id}`, { fullName, phone, email }))

export const changeStaffWarehouse = async (id, warehouseId) =>
    safeApiCall(() => api.patch(`staff/secure/staffs/${id}/warehouse/${warehouseId}`))
export const changeStaffActive = async (id,role) =>
    safeApiCall(() => api.put(`staff/secure/staffs/${id}/active/role/${role}`))
export const changeStaffRole = async (id, roleId) =>
    safeApiCall(() => api.patch(`staff/secure/staffs/${id}/role/${roleId}`))


