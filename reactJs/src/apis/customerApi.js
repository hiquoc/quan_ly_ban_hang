import api,{safeApiCall} from "./api";

export const getCustomerDetails= (customerId)=>
   safeApiCall(()=>api.get(`customer/secure/customers/${customerId}`))

export const getAllCustomers = () =>
  safeApiCall(() => api.get("customer/secure/customers"));

export const updateCustomer= (fullName,phone,email,gender,dateOfBirth)=>
   safeApiCall(()=>api.put(`customer/secure/customers`,{fullName,phone,email,gender,dateOfBirth}))

export const getAllAddressesOfACustomer = () =>
  safeApiCall(() => api.get("customer/secure/customers/addresses"));

export const createAddress= (name,phone,street,ward,district,city)=>
   safeApiCall(()=>api.post(`customer/secure/customers/addresses`,{name,phone,street,ward,district,city}))

export const updateAddress= (id,name,phone,street,ward,district,city)=>
   safeApiCall(()=>api.put(`customer/secure/customers/addresses/${id}`,{name,phone,street,ward,district,city}))

export const changMainAddress= (id)=>
   safeApiCall(()=>api.patch(`customer/secure/customers/addresses/${id}`))

export const deleteAddress= (id)=>
   safeApiCall(()=>api.delete(`customer/secure/customers/addresses/${id}`))

export const getCustomerDashboard = async (from, to) => {
    const params = new URLSearchParams();
    const fromLocal = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
    const toLocal = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);

    params.append("from", formatLocalDate(fromLocal));
    params.append("to", formatLocalDate(toLocal));

    return safeApiCall(() => api.get(`/customer/secure/dashboard?${params.toString()}`))
}

function formatLocalDate(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}