import { Navigate } from "react-router-dom";
import React,{useContext} from 'react'
import { AuthContext } from "../../contexts/AuthContext";
export default function  ProtectedRoute({children}){
    const {username}=useContext(AuthContext)
    const isAuth=!!username;
    if(!isAuth){
        return <Navigate to="/login" replace/>;
    }
    return children;
}
