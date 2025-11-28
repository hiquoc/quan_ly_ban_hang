import jwtDecode from "jwt-decode";

export function getDecodedToken() {
    const localToken = localStorage.getItem("token");
    const sessionToken = sessionStorage.getItem("token");

    const token = localToken || sessionToken;
    const useLocal = !!localToken;
    console.log(token)
    if (!token) return null;

    try {
        const decoded = jwtDecode(token);

        // Check token expiration
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            if (useLocal) localStorage.removeItem("token");
            else sessionStorage.removeItem("token");
            return null;
        }

        return decoded;
    } catch (error) {
        console.error("Invalid token:", error);
        // Remove corrupted token
        if (useLocal) localStorage.removeItem("token");
        else sessionStorage.removeItem("token");
        return null;
    }
}
