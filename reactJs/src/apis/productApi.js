import api, { safeApiCall } from "./api";

export const createProduct = (name, productCode, slug, description, shortDescription, categoryId, brandId, technicalSpecs, imageFile) => {
  const formData = new FormData();
  const productData = {
    name,
    productCode,
    slug,
    description: description || "",
    shortDescription: shortDescription || "",
    categoryId,
    brandId,
    technicalSpecs
  };

  formData.append(
    "product",
    new Blob([JSON.stringify(productData)], { type: "application/json" })
  );

  if (imageFile !== undefined && imageFile) {
    formData.append("image", imageFile);
  }

  return safeApiCall(() =>
    api.post("product/secure/products", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
};

export const updateProduct = (id, name, productCode, slug, description, shortDescription, categoryId, brandId, technicalSpecs, imageFile, mainVariantId) => {
  const formData = new FormData();
  const productData = {
    name,
    productCode,
    slug,
    description: description || "",
    shortDescription: shortDescription || "",
    categoryId,
    brandId,
    technicalSpecs,
    mainVariantId
  };
  // console.log(productData)
  formData.append(
    "product",
    new Blob([JSON.stringify(productData)], { type: "application/json" })
  );

  if (imageFile !== undefined && imageFile) {
    formData.append("image", imageFile);
  }

  return safeApiCall(() =>
    api.put(`product/secure/products/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}

export const changeProductActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/products/active/${id}`));

export const changeProductFeatured = (id) =>
  safeApiCall(() => api.patch(`product/secure/products/featured/${id}`));

export const deleteProduct = (id) =>
  safeApiCall(() => api.delete(`product/secure/products/${id}`));

export const getHomeProducts = (newProduct, discountProduct) =>
  safeApiCall(() => {
    const params = {};
    if (newProduct != null) params.newProduct = newProduct;
    if (discountProduct) params.discountProduct = discountProduct;
    return api.get("product/public/home", { params });
  });


export const getProductVariantByProductId = (id) =>
  safeApiCall(() => api.get(`product/secure/products/${id}/variants`));

export const getActiveProductDetails = (slug) =>
  safeApiCall(() => api.get(`product/public/products/${slug}`));

export const getProductDetails = (slug) =>
  safeApiCall(() => api.get(`product/secure/products/${slug}`));

export const getActiveProducts = (
  page,
  size,
  keyword,
  categoryName,
  brandName,
  featured,
  desc,
  sortBy,
  discount,
  startPrice,
  endPrice,
) =>
  safeApiCall(() => {
    const params = {};
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;

    if (categoryName && categoryName.length > 0) params.categoryName = categoryName;
    if (brandName && brandName.length > 0) params.brandName = brandName;

    if (featured != null) params.featured = featured;
    if (desc != null) params.desc = desc;
    if (sortBy != null) params.sortBy = sortBy;
    if (discount != null) params.discount = discount;
    if (startPrice != null) params.startPrice = startPrice;
    if (endPrice != null) params.endPrice = endPrice;

    return api.get("product/public/products", { params });
  });

export const getAllProducts = (page, size, keyword, categoryName, brandName, active, featured, desc, sortBy, discount) =>
  safeApiCall(() => {
    const params = {};
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (keyword) params.keyword = keyword;

    if (categoryName && categoryName.length > 0) params.categoryName = categoryName;
    if (brandName && brandName.length > 0) params.brandName = brandName;

    if (active != null) params.active = active;
    if (featured != null) params.featured = featured;
    if (desc != null) params.desc = desc;
    if (sortBy != null) params.sortBy = sortBy;
    if (discount != null) params.discount = discount;

    return api.get("product/secure/products", { params });
  });

//////////////
export const getVariantByIdIncludingInactive = (id) =>
  safeApiCall(() => api.get(`product/secure/variants/${id}`));

export const createVariant = (productId, name, sku, attributes, images) => {
  const formData = new FormData();
  const variantData = { productId, name, sku, attributes };

  formData.append(
    "variant",
    new Blob([JSON.stringify(variantData)], { type: "application/json" })
  );
  const validImages = images.filter(img => !img.deleted);

  const mainImage = validImages.find(img => img.isMain);
  if (mainImage) {
    formData.append("images", mainImage.file);
  }

  validImages.forEach(img => {
    if (!img.isMain) formData.append("images", img.file);
  });
  
  return safeApiCall(() =>
    api.post(`product/secure/variants`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}

export const updateVariantInfo = (id, { productId, name, sku, basePrice, discountPercent, importPrice, attributes }) => {
  return safeApiCall(() =>
    api.put(`product/secure/variants/${id}`, {
      productId, name, sku, basePrice, discountPercent, importPrice, attributes
    })
  );
};

export const updateVariantImages = (id, images) => {
  const formData = new FormData();

  images.filter(img => img.file).forEach(img => formData.append("newImages", img.file));

  images.filter(img => img.deleted).forEach(img => formData.append("deletedKeys", img.key));

  const mainImage = images.find(img => img.isMain);
  if (mainImage && mainImage.key) formData.append("newMainKey", mainImage.key);

  return safeApiCall(() =>
    api.post(`product/secure/variants/${id}/images`, formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      })
  );
};

export const updateVariant = async (
  id, productId, name, sku, basePrice, discountPercent, importPrice, attributes, images = []
) => {
  const resInfo = await updateVariantInfo(id, {
    productId,
    name,
    sku,
    basePrice,
    importPrice,
    discountPercent,
    attributes
  });

  if (resInfo?.error) return { error: resInfo.error };

  const hasNewImages = images.some(img => img.file);
  const hasDeletedImages = images.some(img => img.deleted);
  const hasMainChange = images.some(img => img.isMain && img.key);

  if (hasNewImages || hasDeletedImages || hasMainChange) {
    const resImages = await updateVariantImages(id, images);
    if (resImages?.error) return { error: resImages.error };
    return { success: true, data: resImages.data };
  }

  return { success: true, data: resInfo.data };
};


export const changeVariantActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/variants/active/${id}`));

export const changeVariantFeatured = (id) =>
  safeApiCall(() => api.patch(`product/secure/variants/featured/${id}`));

export const deleteVariant = (id) =>
  safeApiCall(() => api.delete(`product/secure/variants/${id}`));

export const getAllVariants = ({ page, size, productId, keyword, active, status, discount, minPrice, maxPrice }
  = {}) =>
  safeApiCall(() => {
    const params = {};
    if (page != null) params.page = page;
    if (size != null) params.size = size;
    if (productId != null) params.productId = productId;
    if (keyword) params.keyword = keyword;
    if (active != null) params.active = active;
    if (status) params.status = status;
    if (discount != null) params.discount = discount;
    if (minPrice != null) params.minPrice = minPrice;
    if (maxPrice != null) params.maxPrice = maxPrice;
    return api.get("product/secure/variants", { params });
  });

export const getVariantsByIds = async (ids) =>
  safeApiCall(() => api.get(`product/secure/variants/by-ids`, { params: { ids } }))

//////////////
export const createCategory = (name, slug, imageFile) => {
  const formData = new FormData();
  const categoryData = {
    name,
    slug,
  };

  formData.append(
    "category",
    new Blob([JSON.stringify(categoryData)], { type: "application/json" })
  );

  if (imageFile !== undefined && imageFile) {
    formData.append("image", imageFile);
  }

  return safeApiCall(() =>
    api.post(`product/secure/categories`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}

export const updateCategory = (id, name, slug, imageFile) => {
  const formData = new FormData();
  const categoryData = {
    name,
    slug,
  };

  formData.append(
    "category",
    new Blob([JSON.stringify(categoryData)], { type: "application/json" })
  );

  if (imageFile !== undefined && imageFile) {
    formData.append("image", imageFile);
  }

  return safeApiCall(() =>
    api.put(`product/secure/categories/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}
export const getActiveCategories = (page, size, keyword) => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append("page", page);
  if (size !== undefined) params.append("size", size);
  if (keyword !== undefined && keyword !== "") params.append("keyword", keyword);

  const queryString = params.toString();
  const url = queryString
    ? `product/public/categories?${queryString}`
    : `product/public/categories`;

  return safeApiCall(() => api.get(url));
};

export const getAllCategories = (page, size, keyword, active) => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append("page", page);
  if (size !== undefined) params.append("size", size);
  if (keyword !== undefined && keyword !== "") params.append("keyword", keyword);
  if (active !== null && active !== undefined) params.append("active", active);

  const queryString = params.toString();
  const url = queryString
    ? `product/secure/categories?${queryString}`
    : `product/secure/categories`;

  return safeApiCall(() => api.get(url));
};

export const changeCategoryActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/categories/active/${id}`));

export const deleteCategory = (id) =>
  safeApiCall(() => api.delete(`product/secure/categories/${id}`));


///////////////
export const createBrand = (name, slug, description, imageFile) => {
  const formData = new FormData();
  const brandData = {
    name,
    slug,
    description,
  };

  formData.append(
    "brand",
    new Blob([JSON.stringify(brandData)], { type: "application/json" })
  );

  if (imageFile !== undefined && imageFile) {
    formData.append("image", imageFile);
  }

  return safeApiCall(() =>
    api.post("product/secure/brands", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}

export const updateBrand = (id, name, slug, description, imageFile) => {
  const formData = new FormData();
  const brandData = {
    name,
    slug,
    description
  };

  formData.append(
    "brand",
    new Blob([JSON.stringify(brandData)], { type: "application/json" })
  );

  if (imageFile !== undefined && imageFile) {
    formData.append("image", imageFile);
  }

  return safeApiCall(() =>
    api.put(`product/secure/brands/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}

export const getActiveBrands = (page, size, keyword, featured) => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append("page", page);
  if (size !== undefined) params.append("size", size);
  if (keyword !== undefined && keyword !== "") params.append("keyword", keyword);
  if (featured !== undefined) params.append("featured", featured);

  const queryString = params.toString();
  const url = queryString
    ? `product/public/brands?${queryString}`
    : `product/public/brands`;

  return safeApiCall(() => api.get(url));
}

export const getAllBrands = (page, size, keyword, active, featured) => {
  const params = new URLSearchParams();

  if (page !== undefined) params.append("page", page);
  if (size !== undefined) params.append("size", size);
  if (keyword !== undefined && keyword !== "") params.append("keyword", keyword);
  if (active !== null && active !== undefined) params.append("active", active);
  if (featured !== null && featured !== undefined) params.append("featured", featured);

  const queryString = params.toString();
  const url = queryString
    ? `product/secure/brands?${queryString}`
    : `product/secure/brands`;

  return safeApiCall(() => api.get(url));
}


export const changeBrandActive = (id) =>
  safeApiCall(() => api.patch(`product/secure/brands/active/${id}`));

export const changeBrandFeatured = (id) =>
  safeApiCall(() => api.patch(`product/secure/brands/featured/${id}`));

export const deleteBrand = (id) =>
  safeApiCall(() => api.delete(`product/secure/brands/${id}`));


export const createProductReview = (orderId, variantId, rating, content, images) => {
  const formData = new FormData();
  const variantData = { orderId, variantId, rating, content };

  formData.append(
    "review",
    new Blob([JSON.stringify(variantData)], { type: "application/json" })
  );

  images.forEach(img => {
    formData.append("images", img);
  });

  return safeApiCall(() =>
    api.post(`product/secure/reviews`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    })
  );
}

export const getProductReviews = (productId, page, size, rating, ownerId) => {
  const params = {};
  if (page !== undefined) params.page = page;
  if (size !== undefined) params.size = size;
  if (rating !== undefined && rating !== "") params.rating = rating;
  if (ownerId !== undefined) params.ownerId = ownerId;

  return safeApiCall(() => api.get(`product/public/review/${productId}`, { params }));
}


export const deleteProductReview = (id) =>
  safeApiCall(() => api.delete(`product/secure/reviews/${id}`))

export const updateProductReview = (id, rating, title, content, newImages, deletedKeys = []) => {
  const formData = new FormData();
  const reviewData = { rating, title, content };

  formData.append(
    "review",
    new Blob([JSON.stringify(reviewData)], { type: "application/json" })
  );

  if (newImages && newImages.length > 0) {
    newImages.forEach(img => formData.append("newImages", img.file || img));
  }

  deletedKeys.forEach(key => formData.append("deletedKeys", key));

  return safeApiCall(() =>
    api.put(`/product/secure/reviews/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};
export const getCustomerReviews = () => {
  return safeApiCall(() => api.get(`/product/secure/reviews/customer`))
}

export const getRandomActiveProductByCategory = async (categorySlug) =>
  safeApiCall(() => api.get(`/product/public/products-random/category/${categorySlug}`))

export const getRecommendedProducts = async (customerId) =>
  safeApiCall(() => api.get(`/product/public/recommendations?customerId=${customerId}`))