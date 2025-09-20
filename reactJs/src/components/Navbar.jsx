import { useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

function Navbar() {
    const {username,role}=useContext(AuthContext);
    const navigate = useNavigate();
    function handleLogout() {
        localStorage.removeItem("token");
        const {setUsername,setRole}=useContext(AuthContext);
        navigate("/login");
    }
    const isLoggedIn = !!localStorage.getItem("token");
    return (
        <nav className="bg-blue-600 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link to="/" className="text-xl font-bold">Home</Link>
                <div className="flex space-x-4">
                    {!isLoggedIn && (
                        <>
                            <Link to="/login" className="hover:bg-blue-700 px-3 py-1 rounded transition">
                                Login
                            </Link>
                            <Link to="/register" className="hover:bg-blue-700 px-3 py-1 rounded transition">
                                Register
                            </Link>
                        </>
                    )}
                    {isLoggedIn && (
                        <>
                            <Link to="/user" 
                            className="hover:bg-blue-700 px-3 py-1 rounded transition">
                                {username}
                            </Link>
                            <button onClick={handleLogout}
                                className="hover:bg-blue-700 px-3 py-1 rounded transition">
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
export default Navbar