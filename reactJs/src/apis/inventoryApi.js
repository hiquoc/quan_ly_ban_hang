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

export const getAllPurchaseOrders = (page, size, status,keyword,warehouseId, startDate, endDate) => {
  const params = new URLSearchParams();
  if (page !== undefined && page !== null) params.append("page", page);
  if (size !== undefined && size !== null) params.append("size", size);
  if (status) params.append("status", status);
  if (keyword) params.append("keyword", keyword);
  if (warehouseId) params.append("warehouseId", warehouseId);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  return safeApiCall(() => api.get(`inventory/secure/orders?${params.toString()}`));
}
////////////
export const getAllInventories = (page, size, keyword, warehouseId, active = true) => {
  let url = "inventory/secure/inventories";

  const params = [];
  if (keyword !== undefined && keyword !== null) params.push(`keyword=${keyword}`);
  if (page !== undefined && page !== null) params.push(`page=${page}`);
  if (size !== undefined && size !== null) params.push(`size=${size}`);
  if (warehouseId !== undefined && warehouseId !== null) params.push(`warehouseId=${warehouseId}`);
  if (active !== undefined && active !== null) params.push(`active=${active}`);

  if (params.length > 0) url += "?" + params.join("&");

  return safeApiCall(() => api.get(url));
};

export const updateInventoryActive = (id) =>
  safeApiCall(() => api.patch(`inventory/secure/inventories/${id}`));

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
  keywordType,
  ignoreReserveRelease,
  warehouseId
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
    ...(ignoreReserveRelease !== undefined && ignoreReserveRelease !== null
      ? { ignoreReserveRelease }
      : {}),
    ...(warehouseId ? { warehouseId } : {}),

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

export const updateInventoryTransactionStatus = (id, status, note) =>
  safeApiCall(() => api.patch(`inventory/secure/transactions/${id}`, { status, note }));

export const getInventoryOrderByStock = async (page, size) => {
  const params = {}
  if (page != null) params.page = page;
  if (size != null) params.size = size;

  return safeApiCall(() => api.get(`inventory/secure/inventories/warning`, { params }))
}

export const getInventoryQuantityChanges = async (id, from, to) => {
  const params = new URLSearchParams();
  params.append("from", new Date(from.setHours(0, 0, 0, 0)).toISOString());
  params.append("to", new Date(to.setHours(23, 59, 59, 999)).toISOString());

  // console.log(`inventory/secure/inventory-quantity/${id}?${params.toString()}`);
  return safeApiCall(() =>
    api.get(`inventory/secure/inventory-quantity/${id}?${params.toString()}`)
  );
};
