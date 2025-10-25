import React, { useState, useContext } from "react"
import { useNavigate, Link } from "react-router-dom"
import { login } from "../../apis/authApi"
import { AuthContext } from "../../contexts/AuthContext"
import { getDecodedToken } from "../../utils/jwt"
import Popup from "../../components/Popup"
function LoginPage() {
    const [usernameInput, setUsernameInput] = useState("")
    const [password, setPassword] = useState("")
    const [popup, setPopup] = useState({ message: "", type: "error" })
    const { setUsername, setAccountId, setRole, setOwnerId } = useContext(AuthContext);
    const navigate = useNavigate()

    function handleUsername(e) {
        setUsernameInput(e.target.value)
    }
    function handlePassword(e) {
        setPassword(e.target.value)
    }

    async function handleLogin(e) {
        e.preventDefault();

        if (!usernameInput || !password) {
            setPopup({ message: "Vui lòng điền đầy đủ thông tin" });
            return;
        }
        const response = await login(usernameInput, password);
        if (response?.error) {
            console.log("Error status:", response.status);
            console.log("Error message:", response.error);

            setPopup({ message: response.error || "Sai tên tài khoản hoặc mật khẩu" });
            return;
        }
        // console.log(response)
        localStorage.setItem("token", response.data.token)
        const decoded = getDecodedToken()

        setUsername(decoded.sub);
        setAccountId(decoded.id);
        setRole(decoded.role);
        setOwnerId(decoded.ownerId)
        // console.log(decoded.role)
        if (decoded.role == "CUSTOMER") {
            navigate("/")
        } else
            navigate("/admin")

    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form className="bg-white p-8 rounded shadow-md w-80">
                <h2 className="text-3xl font-bold mb-6 text-center">Đăng nhập</h2>
                <input onChange={(e) => handleUsername(e)} type="text" placeholder="Tài khoản hoặc Email"
                    className="w-full px-2 py-2.5 mb-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />
                <input onChange={(e) => handlePassword(e)} type="password" placeholder="Mật khẩu"
                 className="w-full px-2 py-2.5 mb-4 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />

                <button onClick={(e) => handleLogin(e)}
                 className="w-full bg-black text-white py-2.5 rounded hover:bg-gray-800 focus:outline-none hover:cursor-pointer">
                    Đăng nhập</button>
                <p className="mt-4 text-center">
                    Chưa có tài khoản? <a href="/register" className="text-blue-500 underline">Đăng ký</a>
                </p>
                <div className="text-center">
                    <a className="text-blue-500"
                        href="http://localhost:8080/oauth2/authorization/google">
                        Đăng nhập với Google
                    </a>
                </div>

            </form>
            <Popup
                message={popup.message}
                type={popup.type}
                onClose={() => setPopup({ message: "" })}
                duration={4000}
            />
        </div>
    )
}
export default LoginPage