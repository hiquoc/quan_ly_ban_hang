import { createContext, useEffect, useState, useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import { getCart, addItemToCart, updateCartItem, removeItemFromCart } from "../apis/cartApi";
import { PopupContext } from "./PopupContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
    const { username } = useContext(AuthContext);
    const { showPopup } = useContext(PopupContext);
    const navigate = useNavigate();
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem("cartData");
        try {
            const parsed = saved ? JSON.parse(saved) : null;
            return parsed || { id: null, items: [], totalItems: 0, subtotal: 0, estimatedTotal: 0 };
        } catch {
            return { id: null, items: [], totalItems: 0, subtotal: 0, estimatedTotal: 0 };
        }
    });
    // console.log(cart)
    useEffect(() => {
        loadCart();
    }, [username]);

    async function loadCart() {
        if (!username) {
            setCart({ items: [], totalItems: 0, subtotal: 0, estimatedTotal: 0 });
            localStorage.removeItem("cartData");
            return;
        }
        try {
            const res = await getCart(username);
            if (res.error) {
                console.log(res.error)
                // showPopup(res.error);
                return;
            }
            setCart(res.data);
            localStorage.setItem("cartData", JSON.stringify(res.data));
        } catch (err) {
            console.error("Failed to fetch cart", err);
        }
    }
    function checkLoggedIn() {
        if (!username) {
            showPopup("Bạn chưa đăng nhập!", () => navigate(`/login`));
            return false;
        }
        return true;
    }
    function recalcCart(cartData) {
        const items = cartData.items || [];
        const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
        return { ...cartData, totalItems, subtotal };
    }

    async function addToCart(variantId, quantity = 1) {
        if (!checkLoggedIn()) return;
        const savedCart = localStorage.getItem("cartData");
        let cartExistsInStorage = false;
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                if (parsedCart?.items?.length > 0) {
                    cartExistsInStorage = true;
                }
            } catch {
                cartExistsInStorage = false;
            }
        }

        let res;
        const existingItem = cart.items.find(item => item.variantId === variantId);
        // console.log(existingItem)
        if (!cartExistsInStorage || !existingItem) {
            res = await addItemToCart(variantId, quantity);
        }
        else {
            res = await updateCartItem(existingItem.id, existingItem.quantity + quantity);
        }
        if (res.error) {
            showPopup(res.error);
            return;
        }

        setCart(prevCart => {
            const updatedItems = prevCart.items.map(item =>
                item.variantId === res.data.variantId ? { ...item, ...res.data } : item
            );

            if (!updatedItems.some(item => item.variantId === res.data.variantId)) {
                updatedItems.push(res.data);
            }

            return recalcCart({ ...prevCart, items: updatedItems });
        });
    }

    async function updateCart(id, quantity = 1) {
        if (!checkLoggedIn()) return;
        if (quantity === 0) return;

        const res = await updateCartItem(id, quantity);
        if (res.error) {
            showPopup(res.error);
            return;
        }

        setCart(prevCart => {
            const updatedItems = prevCart.items.map(item =>
                item.id === res.data.id ? { ...item, ...res.data } : item
            );

            if (!updatedItems.some(item => item.id === res.data.id)) {
                updatedItems.push(res.data);
            }

            return recalcCart({ ...prevCart, items: updatedItems });
        });
    }

    async function removeFromCart(variantId) {
        if (!checkLoggedIn()) return;

        setCart(prevCart => {
            const updatedItems = prevCart.items.filter(item => item.variantId !== variantId);
            return recalcCart({ ...prevCart, items: updatedItems });
        });

        const res = await removeItemFromCart(variantId);
        if (res.error) {
            showPopup(res.error);
            const freshCart = await getCart(username);
            setCart(freshCart.data);
        }
    }
    const buyNow = async (variantId, quantity = 1) => {
        if (!checkLoggedIn()) return;
        const existingItem = cart.items.find(i => i.variantId === variantId);
        if (!existingItem) {
            await addItemToCart(variantId, quantity);
        }

        localStorage.setItem("selectedItems", JSON.stringify([variantId]));
        navigate("/checkout");
    };
    const reloadCart = async () => {
        loadCart();
    }
    const clearSelectedItems = () => {
        localStorage.removeItem("selectedItems");
    };
    const clearCart=()=>
        localStorage.removeItem("cartData")


    return (
        <CartContext.Provider value={{ cart, setCart, addToCart, updateCart, removeFromCart, buyNow, reloadCart, clearSelectedItems,clearCart }}>
            {children}
        </CartContext.Provider>
    );
}
