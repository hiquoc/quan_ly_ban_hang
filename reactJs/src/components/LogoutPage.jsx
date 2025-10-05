// LogoutPage.jsx
import { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function LogoutPage() {
    const { setUsername, setAccountId, setRole ,setOwnerId } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.removeItem("token");

        setUsername(null);
        setAccountId(null);
        setRole(null);
        setOwnerId(null);

        navigate("/login", { replace: true });
    }, []);

    return (
        <div className="flex justify-center items-center h-screen">
            <p className="text-lg text-gray-700">Logging out...</p>
        </div>
    );
}
