import React, { useState, useContext, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { login } from "../../apis/authApi"
import { AuthContext } from "../../contexts/AuthContext"
import { getDecodedToken } from "../../utils/jwt"
import Popup from "../../components/Popup"
import { FiX, FiUser, FiLock } from "react-icons/fi"
import { Helmet } from "react-helmet-async"


function LoginPage() {
    const [usernameInput, setUsernameInput] = useState("")
    const [password, setPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [popup, setPopup] = useState({ message: "", type: "error" })
    const [processingToken, setProcessingToken] = useState(false)
    const { setUsername, setAccountId, setRole, setOwnerId } = useContext(AuthContext)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const token = params.get("token")
        if (token) {
            setProcessingToken(true)
            handleTokenLogin(token)
        }
    }, [location.search])

    function handleUsername(e) {
        setUsernameInput(e.target.value)
    }

    function handlePassword(e) {
        setPassword(e.target.value)
    }

    async function handleLogin(e) {
        e.preventDefault()

        if (!usernameInput || !password) {
            setPopup({ message: "Vui lòng điền đầy đủ thông tin" })
            return
        }

        const response = await login(usernameInput, password)
        if (response?.error) {
            setPopup({ message: response.error || "Sai tên tài khoản hoặc mật khẩu" })
            return
        }
        handleTokenLogin(response.data.token)
    }

    function handleTokenLogin(token) {
        if (rememberMe) localStorage.setItem("token", token)
        else sessionStorage.setItem("token", token)

        const decoded = getDecodedToken();
        setUsername(decoded.sub)
        setAccountId(decoded.id)
        setRole(decoded.role)
        setOwnerId(decoded.ownerId)

        if (decoded.role === "CUSTOMER") navigate("/")
        else {
            localStorage.clear("cartData")
            navigate("/admin/orders")
        }
    }

    if (processingToken) return null

    return (
        <>
            <Helmet>
                <title>Đăng nhập</title></Helmet>

            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
                <form
                    className="bg-white p-10 rounded-lg shadow w-[400px] relative transition-all duration-300 hover:shadow-xl"
                    onSubmit={handleLogin}
                >
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-xl hover:cursor-pointer"
                    >
                        <FiX />
                    </button>

                    <h2 className="text-3xl font-semibold text-center mb-8 text-gray-800">
                        Đăng nhập
                    </h2>

                    {/* Tài khoản */}
                    <div className="relative mb-3">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tên tài khoản"
                            value={usernameInput}
                            onChange={handleUsername}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                        />
                    </div>

                    {/* Mật khẩu */}
                    <div className="relative mb-3">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={handlePassword}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-800"
                        />
                    </div>

                    {/* Ghi nhớ & Quên mật khẩu */}
                    <div className="flex justify-between items-center w-full mb-6">
                        <label className="flex items-center gap-2 text-sm text-gray-700 select-none hover:cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 accent-gray-800 hover:cursor-pointer"
                            />
                            Ghi nhớ đăng nhập
                        </label>
                        <Link
                            to="/forgot-password"
                            className="text-sm text-gray-600 hover:text-blue-500 hover:underline hover:cursor-pointer"
                        >
                            Quên mật khẩu?
                        </Link>
                    </div>

                    {/* Nút đăng nhập */}
                    <button
                        type="submit"
                        className="w-full bg-gray-900 text-white py-2.5 rounded font-medium text-lg hover:bg-gray-800 transition-all duration-200 hover:cursor-pointer"
                    >
                        Đăng nhập
                    </button>

                    {/* Đăng nhập bằng */}
                    <div className="flex flex-col items-center mt-6">
                        <div className="flex items-center w-full mb-3">
                            <hr className="flex-grow border-gray-300" />
                            <span className="px-3 text-gray-500 text-sm">
                                Hoặc đăng nhập bằng
                            </span>
                            <hr className="flex-grow border-gray-300" />
                        </div>

                        <a
                            href="http://localhost:8080/oauth2/authorization/google"
                            className="flex justify-center items-center gap-2 border border-gray-300 w-full py-2.5 rounded hover:bg-gray-50 transition-all duration-200"
                        >
                            <img src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1763208448/Google__G__logo.svg_cwv6jj.webp" alt="Google" className="h-5 w-5" />
                            <span className="text-gray-700 font-medium">Google</span>
                        </a>
                    </div>

                    {/* Chưa có tài khoản */}
                    <p className="mt-6 text-center text-sm text-gray-600">
                        Chưa có tài khoản?{" "}
                        <Link to="/register" className="text-blue-600 font-medium hover:underline">
                            Đăng ký ngay
                        </Link>
                    </p>
                </form>

                <Popup
                    message={popup.message}
                    type={popup.type}
                    onClose={() => setPopup({ message: "" })}
                    duration={4000}
                />
            </div>
        </>
    )
}

export default LoginPage
