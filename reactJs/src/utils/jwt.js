import jwtDecode from "jwt-decode";

export function getDecodedToken() {
    let token = localStorage.getItem("token") || sessionStorage.getItem("token");
     if (!token) return null;

    try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
            if (useLocal) localStorage.removeItem("token");
            else sessionStorage.removeItem("token");
            return null;
        }
        return decoded;
    } catch (error) {
        console.log("Invalid token: ", error);
        return null;
    }
}
