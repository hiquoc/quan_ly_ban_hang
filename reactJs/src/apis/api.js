import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080/",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isHandling401 = false;

const handle401Urls = ["/admin", "/customer"];

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url || "";
        const shouldHandle = handle401Urls.some(u => url.includes(u));

        if (error.response?.status === 401 && shouldHandle) {
            if (!isHandling401) {
                isHandling401 = true;

                setTimeout(() => {
                    alert("Hết phiên đăng nhập! Vui lòng đăng nhập lại");
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                }, 1000);
            }
        }

        return Promise.reject(error);
    }
);

export const safeApiCall = async (apiCall) => {
    try {
        const response = await apiCall();
        if (response?.data?.message) {
            return {
                success: response.data.success,
                message: response.data.message,
                data: response.data.data
            };
        }
        return response;
    } catch (err) {
        console.error("API call failed:", err);
        const message =
            err.response?.data?.message || // backend message
            err.response?.statusText ||    // fallback
            err.message ||                 // network/axios error
            "Unknown error";
        const status = err.response?.status || null;
        return { error: message, status };
    }
};



export default api;


