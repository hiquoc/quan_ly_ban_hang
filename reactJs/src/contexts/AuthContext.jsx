import { useEffect, useState, createContext } from "react";
import { getDecodedToken } from "../utils/jwt";

export const AuthContext = createContext();
export function AuthProvider({ children }) {

    const decoded = getDecodedToken();
    const intialUsername = decoded?.sub || null;
    const initalRole = decoded?.role || null;
    const [username, setUsername] = useState(intialUsername);
    const [role, setRole] = useState(initalRole);
    //console.log(decoded)

    return <AuthContext.Provider value={{ username, setUsername, role, setRole }}>
        {children}
    </AuthContext.Provider>
}