import api, { safeApiCall } from "./api";

export const getCart = () =>
  safeApiCall(() => api.get("cart/customer"));

export const addItemToCart=(variantId,quantity)=>
    safeApiCall(()=>api.post("cart",{variantId,quantity}))

export const updateCartItem=(cardId,quantity)=>
    safeApiCall(()=>api.put(`cart/${cardId}`,{quantity}))

export const removeItemFromCart=(variantId)=>
    safeApiCall(()=>api.delete(`cart/customer/variant/${variantId}`))

