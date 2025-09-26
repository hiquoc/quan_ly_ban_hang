import axios from "axios";

const authApi = axios.create({
  baseURL: "http://localhost:8080/auth/",
  headers: {
    "Content-Type": "application/json"
  }
})

export const login = (username, password) => {
  return authApi.post("public/login", { username, password });
}
export const customerRegister = (username, password, fullName, phone, email) => {
  return authApi.post("public/register",
    { username, password, fullName, phone, email });
};
export const userRegister = (username, password, fullName, phone, email) => {
  const token = localStorage.getItem("token");
  return authApi.post(
    "secure/register",
    { username, password, fullName, phone, email },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};
export const getAllAccounts = () => {
  const token = localStorage.getItem("token");
  return authApi.get("secure/accounts", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


export default authApi