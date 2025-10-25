// contexts/PopupContext.jsx
import { createContext, useState } from "react";
import Popup from "../components/Popup";

export const PopupContext = createContext();

export function PopupProvider({ children }) {
  // Add optional onClose callback
  const [popup, setPopup] = useState({ message: "", type: "", onClose: null });

  const showPopup = (message, type = "error", onClose = null) => {
    setPopup({ message, type, onClose });
    // If you want auto-dismiss, you can add a timeout here
    // setTimeout(() => handleClose(), duration);
  };

  const handleClose = () => {
    if (popup.onClose) popup.onClose();
    setPopup({ message: "", type: "", onClose: null });
  };

  return (
    <PopupContext.Provider value={{ popup, showPopup }}>
      {children}
      {popup.message && (
        <Popup
          message={popup.message}
          type={popup.type}
          onClose={handleClose}
        />
      )}
    </PopupContext.Provider>
  );
}
