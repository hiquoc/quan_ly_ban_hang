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
    const { setUsername, setAccountId, setRole, setOwnerId, setStaffWarehouseId } = useContext(AuthContext)
    const navigate = useNavigate()
    const location = useLocation()
    const [isProcessing, setIsProcessing] = useState(false)

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
        if (isProcessing) return;
        try {
            setIsProcessing(true)
            if (!usernameInput || !password) {
                setPopup({ message: "Vui lòng điền đầy đủ thông tin" })
                return
            }

            const response = await login(usernameInput, password)
            if (response?.error) {
                setPopup({ message: response.error || "Sai tên tài khoản hoặc mật khẩu" })
                return
            }

            handleTokenLogin(response.data.token, rememberMe)
        } finally {
            setIsProcessing(false)
        }
    }

    function handleTokenLogin(token, remember) {
        if (remember) localStorage.setItem("token", token)
        else sessionStorage.setItem("token", token)

        const decoded = getDecodedToken()
        if (!decoded) return

        setUsername(decoded.sub)
        setAccountId(decoded.id)
        setRole(decoded.role)
        setOwnerId(decoded.ownerId)
        setStaffWarehouseId(decoded.warehouseId)

        if (decoded.role === "CUSTOMER") navigate("/")
        else {
            localStorage.removeItem("cartData")
            navigate("/admin/orders")
        }
    }


    if (processingToken) return null

    return (
        <>
            <Helmet>
                <title>Đăng nhập</title>
            </Helmet>

            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
                <form
                    className="bg-white p-10 rounded-2xl shadow-2xl w-[420px] relative transition-all duration-300 hover:shadow-3xl border border-gray-100"
                    onSubmit={handleLogin}
                >
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl hover:cursor-pointer transition-all duration-200 hover:rotate-90"
                    >
                        <FiX />
                    </button>

                    <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
                        Đăng nhập
                    </h2>

                    {/* Tài khoản */}
                    <div className="relative mb-4">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tên tài khoản"
                            value={usernameInput}
                            onChange={handleUsername}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                        />
                    </div>

                    {/* Mật khẩu */}
                    <div className="relative mb-4">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="password"
                            placeholder="Mật khẩu"
                            value={password}
                            onChange={handlePassword}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
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
                            to="/forgot"
                            className="text-sm text-gray-700 hover:text-gray-900 hover:underline hover:cursor-pointer font-medium"
                        >
                            Quên mật khẩu?
                        </Link>
                    </div>

                    {/* Nút đăng nhập */}
                    <button
                        type="submit"
                        className="flex justify-center items-center gap-2 w-full bg-gray-900 text-white py-3 rounded-lg font-semibold text-base hover:bg-gray-800 transition-all duration-200 hover:cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                        {isProcessing && (
                            <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                ></path>
                            </svg>
                        )}
                        Đăng nhập
                    </button>

                    {/* Đăng nhập bằng */}
                    <div className="flex flex-col items-center mt-6">
                        <div className="flex items-center w-full mb-4">
                            <hr className="flex-grow border-gray-200" />
                            <span className="px-3 text-gray-500 text-sm">
                                Hoặc đăng nhập bằng
                            </span>
                            <hr className="flex-grow border-gray-200" />
                        </div>

                        <a
                            href="http://localhost:8080/oauth2/authorization/google"
                            className="flex justify-center items-center gap-2 border-2 border-gray-200 w-full py-3 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow"
                        >
                            <img src="https://res.cloudinary.com/dtvs3rgbw/image/upload/v1763208448/Google__G__logo.svg_cwv6jj.webp" alt="Google" className="h-5 w-5" />
                            <span className="text-gray-700 font-semibold">Google</span>
                        </a>
                    </div>

                    {/* Chưa có tài khoản */}
                    <p className="mt-6 text-center text-sm text-gray-600">
                        Chưa có tài khoản?{" "}
                        <Link to="/register" className="text-gray-900 font-semibold hover:text-gray-700 hover:underline">
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