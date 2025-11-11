import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { PopupContext } from "../contexts/PopupContext";

export default function PaymentCheck() {
    const { showPopup } = useContext(PopupContext);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const orderNumber = searchParams.get("orderNumber");
        const message = searchParams.get("message");

        const status = location.pathname.includes("/success") ? "success" : "failure";

        if (status === "success") {
            showPopup(`Thanh toán thành công!`, "success");
        } else {
            showPopup(`Thanh toán thất bại!`);
        }

        const timer = setTimeout(() => {
            navigate("/customer");
        }, 1000);

        return () => clearTimeout(timer);
    }, [searchParams, location.pathname, navigate]);

    return null;
}
