import api,{safeApiCall} from "./api";

export const getCustomerDetails= (customerId)=>
   safeApiCall(()=>api.get(`customer/secure/customers/${customerId}`))

export const getAllCustomers = () =>
  safeApiCall(() => api.get("customer/secure/customers"));

export const updateCustomer= (fullName,phone,email,gender,dateOfBirth)=>
   safeApiCall(()=>api.put(`customer/secure/customers`,{fullName,phone,email,gender,dateOfBirth}))

export const getAllAddressesOfACustomer = () =>
  safeApiCall(() => api.get("customer/secure/customers/addresses"));

export const createAddress= (street,ward,district,city)=>
   safeApiCall(()=>api.post(`customer/secure/customers/addresses`,{street,ward,district,city}))

export const updateAddress= (id,street,ward,district,city)=>
   safeApiCall(()=>api.put(`customer/secure/customers/addresses/${id}`,{street,ward,district,city}))

export const changMainAddress= (id)=>
   safeApiCall(()=>api.patch(`customer/secure/customers/addresses/${id}`))

export const deleteAddress= (id)=>
   safeApiCall(()=>api.delete(`customer/secure/customers/addresses/${id}`))