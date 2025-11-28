package com.datn.order_service.utils;

import com.datn.order_service.dto.OrderEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderEventPublisher {
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publish(OrderEvent event) {
        messagingTemplate.convertAndSend("/topic/orders", event);
    }
}
