import { useEffect, useState, createContext } from "react";
import { getDecodedToken } from "../utils/jwt";

export const AuthContext = createContext();
export function AuthProvider({ children }) {
    const [username, setUsername] = useState(null);
    const [role, setRole] = useState(null);
    useEffect(() => {
        const decoded = getDecodedToken();
        if (decoded) {
            if (decoded.exp * 1000 > Date.now()) {
                setUsername(decoded.sub);
                setRole(decoded.role);
            } else {
                setUsername(null);
                setRole(null);
            }
        }
        console.log(decoded)
    }, []);
    return <AuthContext.Provider value={{ username, setUsername, role, setRole }}>
        {children}
    </AuthContext.Provider>
}