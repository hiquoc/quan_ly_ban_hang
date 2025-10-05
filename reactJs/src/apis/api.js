import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080/",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isHandling401 = false;

const ignore401Urls = ["/login"];

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url;
        const shouldIgnore = ignore401Urls.some(u => url.includes(u));

        if (error.response?.status === 401 && !shouldIgnore) {
            if (!isHandling401) {
                isHandling401 = true;
                alert("Hết phiên đăng nhập! Vui lòng đăng nhập lại");
                localStorage.removeItem("token");
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

export const safeApiCall = async (apiCall) => {
    try {
        const response = await apiCall();
        if (response?.data?.message) {
            return { success: response.data.success, message: response.data.message, data: response.data.data };
        }
        return response;
    } catch (err) {
        console.error("API call failed:", err);
        const message =
            err.response?.data?.message || // server-sent message
            err.response?.statusText ||     // fallback to status text
            err.message ||                  // network error
            "Unknown error";

        const status = err.response?.status || null;

        return { error: message, status };
    }
};

export default api;


