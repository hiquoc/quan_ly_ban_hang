import api, { safeApiCall } from "./api";

function formatLocalDate(date) {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const getDashboard = async (from, to,orderPage) => {
    const params = new URLSearchParams();
    const fromLocal = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
    const toLocal = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);

    params.append("from", formatLocalDate(fromLocal));
    params.append("to", formatLocalDate(toLocal));
    if(orderPage)
        params.append("orderPage",orderPage)
    return safeApiCall(() => api.get(`/dashboard?${params.toString()}`));
};




