import  jwtDecode from "jwt-decode"; 

export function getDecodedToken(){
    const token=localStorage.getItem("token");
    if(!token) return null;
    try{
        return jwtDecode(token);
    }catch(error){
        console.log("Invaid token: ",error);
        return null;
    }
}