import React,{useState} from "react"
import { useNavigate,Link } from "react-router-dom"
import { login } from "../../api/authApi"
function LoginPage() {
    const [username,setUsername]=useState("")
    const [password,setPassword]=useState("")
    const navigate=useNavigate()
    function handleUsername(e){
        setUsername(e.target.value)
    }
    function handlePassword(e){
        setPassword(e.target.value)
    }
    async function handleLogin(e){
        e.preventDefault();
        //check input
        try{
            const response=await login(username,password);
            console.log("Login success: ",response.data);
            localStorage.setItem("token",response.data.token)
            navigate("/")
        }
        catch(error){
            console.log("Error "+error.response?.data?.error);
        }
        
    }
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form className="bg-white p-8 rounded shadow-md w-80">
                <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
                <input onChange={(e)=>handleUsername(e)} type="text" placeholder="Username" className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input onChange={(e)=>handlePassword(e)} type="password" placeholder="Password" className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={(e)=>handleLogin(e)} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Login</button>
                <p className="mt-4 text-center">
                    Don't have an account? <Link to="/register" className="text-blue-500">Register</Link>
                </p>
            </form>
        </div>
    )
}
export default LoginPage