import api,{safeApiCall} from "./api";

export const createProduct = (name,productCode,slug,description,shortDescription,categoryId,brandId,technicalSpecs,imageUrl) =>
  safeApiCall(() => api.post("product/secure/products", {name,productCode,slug,description,shortDescription,categoryId,brandId,technicalSpecs,imageUrl}));

export const updateProduct = (id,name,slug,description,shortDescription,categoryId,brandId,technicalSpecs,imageUrl) =>
  safeApiCall(() => api.put(`product/secure/products/${id}`, { name,slug,description,shortDescription,categoryId,brandId,technicalSpecs,imageUrl}));

export const changeProductActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/products/active/${id}`));

export const changeProductFeatured = (id) =>
  safeApiCall(() => api.patch(`product/secure/products/featured/${id}`));

export const deleteProduct = (id) =>
  safeApiCall(() => api.delete(`product/secure/products/${id}`));

export const getAllProducts = () =>
  safeApiCall(() => api.get("product/secure/products"));


//////////////
export const createVariant = (productId,name,sku,attributes,imageUrls) =>
  safeApiCall(() => api.post("product/secure/variants", {productId,name,sku,attributes,imageUrls}));

  
export const updateVariant = (id,productId,name,sku,sellingPrice,discountPercent,attributes,imageUrls) =>
  safeApiCall(() => api.put(`product/secure/variants/${id}`, { productId,name,sku,sellingPrice,discountPercent,attributes,imageUrls}));

export const changeVariantActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/variants/active/${id}`));

export const changeVariantFeatured = (id) =>
  safeApiCall(() => api.patch(`product/secure/variants/featured/${id}`));

export const deleteVariant = (id) =>
  safeApiCall(() => api.delete(`product/secure/variants/${id}`));

export const getAllVariants = () =>
  safeApiCall(() => api.get("product/secure/variants"));

//////////////
export const createCategory = (name,slug,imageUrl) =>
  safeApiCall(() => api.post("product/secure/categories", { name,slug,imageUrl}));

export const updateCategory = (id,name,slug,imageUrl) =>
  safeApiCall(() => api.put(`product/secure/categories/${id}`, { name,slug,imageUrl}));

export const getAllCategories = () =>
  safeApiCall(() => api.get("product/secure/categories"));

export const changeCategoryActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/categories/active/${id}`));

export const deleteCategory = (id) =>
  safeApiCall(() => api.delete(`product/secure/categories/${id}`));


///////////////
export const createBrand = (name,slug,imageUrl) =>
  safeApiCall(() => api.post("product/secure/brands", { name,slug,imageUrl}));

export const updateBrand = (id,name,slug,imageUrl) =>
  safeApiCall(() => api.put(`product/secure/brands/${id}`, { name,slug,imageUrl}));

export const getAllBrands = () =>
  safeApiCall(() => api.get("product/secure/brands"));

export const changeBrandActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/brands/active/${id}`));

export const deleteBrand = (id) =>
  safeApiCall(() => api.delete(`product/secure/brands/${id}`));
