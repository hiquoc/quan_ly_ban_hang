import api, { safeApiCall } from "./api";

export const login = (username, password) =>
  safeApiCall(() => api.post("auth/public/login", { username, password }));

export const customerRegister = (username, password, fullName, phone, email) =>
  safeApiCall(() => api.post("auth/public/register", { username, password, fullName, phone, email }));

export const staffRegister = (username, password, fullName, phone, email) =>
  safeApiCall(() => api.post("auth/secure/register", { username, password, fullName, phone, email }));

export const changePassword=(newPassword,oldPassword) =>
  safeApiCall(()=>api.patch("auth/secure/accounts",{newPassword,oldPassword}));

  

export const getAllAccounts = () =>
  safeApiCall(() => api.get("auth/secure/accounts"));

export const changeAccountRole = async (accountId,roleId) => {
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

