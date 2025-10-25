import api, { safeApiCall } from "./api";

export const createSupplier = (name, code, phone, email, address, taxCode, description) =>
  safeApiCall(() => api.post("inventory/secure/suppliers", { name, code, phone, email, address, taxCode, description }));

export const updateSupplier = (id, name, code, phone, email, address, taxCode, description) =>
  safeApiCall(() => api.put(`inventory/secure/suppliers/${id}`, { name, code, phone, email, address, taxCode, description }));

export const deleteSupplier = (id) =>
  safeApiCall(() => api.delete(`inventory/secure/suppliers/${id}`));

export const getAllSuppliers = () =>
  safeApiCall(() => api.get("inventory/secure/suppliers"));

//////////////

export const createWarehouse = (name, code, address, description) =>
  safeApiCall(() => api.post("inventory/secure/warehouses", { name, code, address, description }));

export const updateWarehouse = (id, name, code, address, description) =>
  safeApiCall(() => api.put(`inventory/secure/warehouses/${id}`, { name, code, address, description }));

export const deleteWarehouse = (id) =>
  safeApiCall(() => api.delete(`inventory/secure/warehouses/${id}`));

export const getAllWarehouses = () =>
  safeApiCall(() => api.get("inventory/secure/warehouses"));

//////////////

export const createPurchaseOrder = (supplierId, warehouseId, items) =>
  safeApiCall(() => api.post("inventory/secure/orders", { supplierId, warehouseId, items }));

export const updatePurchaseOrder = (id, supplierId, warehouseId, items) =>
  safeApiCall(() => api.put(`inventory/secure/orders/${id}`, { supplierId, warehouseId, items }));

export const updatePurchaseOrderStatus = (id, status) =>
  safeApiCall(() => api.patch(`inventory/secure/orders/${id}`, { status }));

export const getAllPurchaseOrders = (page, size, status, startDate, endDate) => {
  const params = new URLSearchParams();
  if (page !== undefined && page !== null) params.append("page", page);
  if (size !== undefined && size !== null) params.append("size", size);
  if (status) params.append("status", status);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  return safeApiCall(() => api.get(`inventory/secure/orders?${params.toString()}`));
}
////////////
export const getAllInventories = (keyword, page, size) => {
  let url = "inventory/secure/inventories";

  const params = [];
  if (keyword !== undefined && keyword !== null) params.push(`keyword=${keyword}`);
  if (page !== undefined && page !== null) params.push(`page=${page}`);
  if (size !== undefined && size !== null) params.push(`size=${size}`);

  if (params.length > 0) url += "?" + params.join("&");

  return safeApiCall(() => api.get(url));
};
export const getInventoriesByVariantId = (id) =>
  safeApiCall(() => api.get(`inventory/secure/inventories/variantId/${id}`))


export const createInventoryTransaction = (req) =>
  safeApiCall(() => api.post(`inventory/secure/transactions`, req));

export const getInventoryTransactions = (
  page,
  size,
  status,
  type,
  startDate,
  endDate,
  keyword,
  keywordType
) => {
  const params = new URLSearchParams({
    page,
    size,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(keyword?.trim() ? { keyword: keyword.trim() } : {}),
    ...(keywordType?.trim() ? { keywordType } : {}),
  });

  return safeApiCall(() => api.get(`inventory/secure/transactions?${params.toString()}`));
};


export const getInventoryTransaction = (id, page, size, startDate, endDate) => {
  const params = new URLSearchParams({
    page,
    size,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  });

  return safeApiCall(() => api.get(`inventory/secure/transactions/${id}?${params.toString()}`));
}

export const updateInventoryTransactionStatus = (id, status) =>
  safeApiCall(() => api.patch(`inventory/secure/transactions/${id}`, status));

