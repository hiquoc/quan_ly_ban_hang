import axios from "axios";

const authApi=axios.create({
    baseURL:"http://localhost:8080/auth",
    headers:{
        "Content-Type":"application/json"
    }
})

export const login=(username,password)=>{
    return authApi.post("/login",{username,password});
}
export const register=(username,password)=>{
    return authApi.post("/register",{username,password})
}
export default authApi