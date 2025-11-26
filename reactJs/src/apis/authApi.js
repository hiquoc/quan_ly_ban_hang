import api, { safeApiCall } from "./api";

export const login = (username, password) =>
  safeApiCall(() => api.post("auth/public/login", { username, password }));

export const customerRegister = (username, password, fullName, phone, email) =>
  safeApiCall(() => api.post("auth/public/register", { username, password, fullName, phone, email }));

export const staffRegister = (username, password, fullName, phone, email,warehouseId,isStaff) =>
  safeApiCall(() => api.post("auth/secure/register", { username, password, fullName, phone, email,warehouseId,isStaff }));

export const changePassword = (newPassword, oldPassword) =>
  safeApiCall(() => api.patch("auth/secure/accounts", { newPassword, oldPassword }));



export const getAllAccounts = (page, size, keyword, type, active, roleId) => {
  const params = {};
  if (page != null) params.page = page;
  if (size != null) params.size = size;
  if (keyword) params.keyword = keyword;
  if (type) params.type = type;
  if (active != null) params.active = active;
  if (roleId != null) params.roleId = roleId;

  return safeApiCall(() => api.get("auth/secure/accounts", { params }));
};


export const changeAccountRole = async (accountId, roleId) => {
  const result = await safeApiCall(() => api.patch(`auth/secure/accounts/${accountId}/role/${roleId}`));
  if (result?.error) return { error: result.error };

  return { success: result.success, message: result.message };
};
export const changeAccountActive = async (accountId) => {
  const result = await safeApiCall(() => api.patch(`auth/secure/accounts/active/${accountId}`));
  if (result?.error) return { error: result.error };

  return { success: result.success, message: result.message };
};

export const deleteAccount = async (accountId) => {
  const result = await safeApiCall(() => api.delete(`auth/secure/accounts/${accountId}`));
  if (result?.error) return { error: result.error };
  return { success: result.success, message: result.message };
};
export const restoreAccount = async (accountId) => {
  const result = await safeApiCall(() => api.patch(`auth/secure/accounts/restore/${accountId}`));
  if (result?.error) return { error: result.error };
  return { success: result.success, message: result.message };
};

////////////////
export const requestVerificationCode = (email) =>
   safeApiCall(() => api.post(`auth/public/verify/send`, { email }))
export const requestVerificationCodeSecure = (email) =>
   safeApiCall(() => api.post(`auth/secure/verify/send`, { email }))

export const checkVerificationCode = (email,code) =>
   safeApiCall(() => api.post(`auth/public/verify/check`, { email ,code}))

export const checkVerificationCodeSecure = (email,code) =>
   safeApiCall(() => api.post(`auth/secure/verify/check`, { email ,code}))