import api,{safeApiCall} from "./api";

export const getAllStaffs = () =>
  safeApiCall(() => api.get("staff/secure/staffs"));

export const getStaffDetails=(id)=>
  safeApiCall(()=>api.get(`staff/secure/staffs/${id}`))

export const updateStaffDetails=(id,fullName,phone,email)=>
  safeApiCall(()=>api.put(`staff/secure/staffs/${id}`,{fullName,phone,email}))


