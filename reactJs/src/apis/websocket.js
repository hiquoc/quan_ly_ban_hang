import SockJS from "sockjs-client";
import { over } from "stompjs";

let stompClient = null;

export const connectWebSocket = (token, onMessageReceived) => {
    const socket = new SockJS(`http://localhost:8080/orders/ws?token=${token}`);
    stompClient = over(socket);

    stompClient.connect(
        {},
        () => {
            // console.log("Connected to WebSocket");
            stompClient.subscribe("/topic/orders", (msg) => {
                const event = JSON.parse(msg.body);
                onMessageReceived(event);
            });
        }
    );
};

export const disconnectWebSocket = () => {
    if (stompClient) stompClient.disconnect();
};
