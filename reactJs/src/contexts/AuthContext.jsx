import { useEffect, useState, createContext } from "react";
import { getDecodedToken } from "../utils/jwt";

export const AuthContext = createContext();
export function AuthProvider({ children }) {

    const decoded = getDecodedToken();
    const intialUsername = decoded?.sub || null;
    const initalAccountId = decoded?.id || null;
    const initalRole = decoded?.role || null;
    const initalOwnerId = decoded?.ownerId || null;
    const [username, setUsername] = useState(intialUsername);
    const [accountId, setAccountId] = useState(initalAccountId);
    const [role, setRole] = useState(initalRole);
    const [ownerId, setOwnerId] = useState(initalOwnerId);
    //console.log(decoded)

    return <AuthContext.Provider value={
        { username, setUsername, accountId, setAccountId, role, setRole ,ownerId, setOwnerId}}>
        {children}
    </AuthContext.Provider>
}