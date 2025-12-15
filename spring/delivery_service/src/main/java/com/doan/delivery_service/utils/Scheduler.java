package com.doan.delivery_service.utils;

import com.doan.delivery_service.sevices.DeliveryOrderService;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

@Component
@AllArgsConstructor
public class Scheduler {

    private final DeliveryOrderService deliveryOrderService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Scheduled(fixedDelay = 2 * 60 * 1000)
    public void autoAssignDeliveryOrders() {
        if (!running.compareAndSet(false, true)) return;

        try {
            deliveryOrderService.autoAssignDeliveryOrders();
        } finally {
            running.set(false);
        }
    }
}

