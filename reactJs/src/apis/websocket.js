import SockJS from "sockjs-client";
import { over } from "stompjs";

let stompClient = null;

export const connectWebSocket = (token, onMessageReceived) => {
    const socket = new SockJS(`https://api.elecstoredoantotnghiep.id.vn/orders/ws?token=${token}`);
    stompClient = over(socket);

    stompClient.connect(
        {},
        () => {
            const subscription = stompClient.subscribe("/topic/orders", (msg) => {
                const event = JSON.parse(msg.body);
                onMessageReceived(event);
            });

            // Save unsubscribe function for cleanup
            stompClient.unsubscribeFn = () => {
                if (subscription) subscription.unsubscribe();
            };
        },
        (error) => {
            console.error("WebSocket connection error:", error);
        }
    );
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        if (stompClient.unsubscribeFn) {
            stompClient.unsubscribeFn();
            stompClient.unsubscribeFn = null;
        }
        if (stompClient.connected) {
            stompClient.disconnect(() => {
                // console.log("WebSocket disconnected");
            });
        }
        stompClient = null;
    }
};
