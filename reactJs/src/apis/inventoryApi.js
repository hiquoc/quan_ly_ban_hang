import api,{safeApiCall} from "./api";

export const createSupplier = (name,contactName,phone,email,taxCode) =>
  safeApiCall(() => api.post("inventory/secure/suppliers", {name,contactName,phone,email,taxCode}));

export const getAllSuppliers = () =>
  safeApiCall(() => api.get("inventory/secure/suppliers"));