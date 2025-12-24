package com.datn.order_service.utils;

import com.datn.order_service.service.OrderService;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

@Component
@AllArgsConstructor
public class Scheduler {

    private final OrderService orderService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Scheduled(cron = "0 0 0 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void autoConfirmOrders() {
        if (!running.compareAndSet(false, true)) return;

        try {
            orderService.autoConfirmOrders();
        } finally {
            running.set(false);
        }
    }
}

