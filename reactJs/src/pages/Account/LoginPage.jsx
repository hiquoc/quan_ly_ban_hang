import React, { useState, useContext } from "react"
import { useNavigate, Link } from "react-router-dom"
import { login } from "../../api/authApi"
import { AuthContext } from "../../contexts/AuthContext"
import { getDecodedToken } from "../../utils/jwt"
import Popup from "../../components/Popup"
function LoginPage() {
    const [usernameInput, setUsernameInput] = useState("")
    const [password, setPassword] = useState("")
    const [popup, setPopup] = useState({ message: "" ,type:"error"})
    const { setUsername, setRole } = useContext(AuthContext);
    const navigate = useNavigate()

    function handleUsername(e) {
        setUsernameInput(e.target.value)
    }
    function handlePassword(e) {
        setPassword(e.target.value)
    }

    async function handleLogin(e) {
        e.preventDefault();
        try {
            if (!usernameInput || !password) {
                setPopup({ message: "Vui lòng điền đầy đủ thông tin" });
                return;
            }
            const response = await login(usernameInput, password);
            console.log(response.status)
            console.log(response.data)

            if (!response.data.success) {
                setPopup({ message: response.data.message || "Lỗi khi đăng nhập" })
                return
            }

            const token = localStorage.setItem("token", response.data.data.token)
            const decoded = getDecodedToken(token);
            setUsername(decoded.sub);
            setRole(decoded.role);
            console.log(decoded.role)
            if(decoded.role=="CUSTOMER"){
                navigate("/")
            }else
                navigate("/admin")
        }
        catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || "Unknown error";

            console.log("Error status:", status);
            console.log("Error message:", message);
            setPopup({ message: "Sai tên tài khoản hoặc mật khẩu"})

        }
    }
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form className="bg-white p-8 rounded shadow-md w-80">
                <h2 className="text-2xl font-bold mb-6 text-center">Đăng nhập</h2>
                <input onChange={(e) => handleUsername(e)} type="text" placeholder="Tài khoản" className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input onChange={(e) => handlePassword(e)} type="password" placeholder="Mật khẩu" className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />

                <button onClick={(e) => handleLogin(e)} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
                    Đăng nhập</button>
                <p className="mt-4 text-center">
                    Chưa có tài khoản? <a href="/register" className="text-blue-500 underline">Đăng ký</a>
                </p>
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