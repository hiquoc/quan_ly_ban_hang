import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { customerRegister } from "../../apis/authApi"
import Popup from "../../components/Popup"
import { Navigate } from "react-router-dom";

function RegisterPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [rePassword, setRePassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [phone, setPhone] = useState("")
    const [email, setEmail] = useState("")
    const [popup, setPopup] = useState({ message: "" })
    const navigate = useNavigate();

    function handleUsername(e) {
        setUsername(e.target.value)
    }
    function handlePassword(e) {
        setPassword(e.target.value)
    }
    function handleRePassword(e) {
        setRePassword(e.target.value)
    }
    function handleFullName(e) {
        setFullName(e.target.value)
    }
    function handlePhone(e) {
        setPhone(e.target.value)
    }
    function handleEmail(e) {
        setEmail(e.target.value)
    }
    function isValidUsername(username) {
        // 1. Reject emails
        if (/@/.test(username)) return false;

        // 2. Allow only letters, numbers, underscores, hyphens
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        return usernameRegex.test(username);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        //check input
        if (!username || !password || !rePassword) {
            setPopup({ message: "Vui lòng điền đầy đủ thông tin!", type: "error" })
            return;
        }
        if (password !== rePassword) {
            setPopup({ message: "Mật khẩu không khớp!", type: "error" })
            return;
        }
        if (!isValidUsername(username)) {
            setPopup({ message: "Tên tài khoản không được chứa kí tự đặc biệt!", type: "error" })
            return;
        }
        try {
            const response = await customerRegister(username, password, fullName, phone, email);
            
            if (response.error != null) {
                console.log(response);
                setPopup({ message: response.error, type: "error" })
                return;
            } 
            setPopup({ message: "Tạo tài khoản thành công!\nVui lòng đăng nhập.",type:"success" });
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        }
        catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || "Unknown error";
            setPopup({ message: "Có lỗi xảy ra!" })
            console.log("Error status:", status);
            console.log("Error message:", message);
        }
    }
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form className="bg-white p-8 rounded shadow-md w-100">
                <h2 className="text-3xl font-bold mb-6 text-center">Đăng kí</h2>
                <input onChange={(e) => handleUsername(e)} type="text" placeholder="Tài khoản" className="w-full px-2 py-2.5 mb-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />
                <input onChange={(e) => handlePassword(e)} type="password" placeholder="Mật khẩu" className="w-full px-2 py-2.5 mb-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />
                <input onChange={(e) => handleRePassword(e)} type="password" placeholder="Nhập lại mật khẩu" className="w-full px-2 py-2.5 mb-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />
                <input onChange={(e) => handleFullName(e)} type="text" placeholder="Họ và tên (không bắt buộc)" className="w-full px-2 py-2.5 mb-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />
                <input onChange={(e) => handleEmail(e)} type="text" placeholder="Email (không bắt buộc)" className="w-full px-2 py-2.5 mb-2 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />
                <input onChange={(e) => handlePhone(e)} type="text" placeholder="Số điện thoại (không bắt buộc)" className="w-full px-2 py-2.5 mb-4 border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-gray-800" />

                <button onClick={(e) => handleSubmit(e)} className="w-full bg-black text-white py-2.5 rounded hover:bg-gray-800 hover:cursor-pointer">Đăng kí</button>
                <p className="mt-4 text-center">
                    Đã có tài khoản? <Link to="/login" className="text-blue-600 underline">Đăng nhập</Link>
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
export default RegisterPage