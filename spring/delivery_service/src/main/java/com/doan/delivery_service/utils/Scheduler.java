package com.doan.delivery_service.utils;

import com.doan.delivery_service.sevices.DeliveryOrderService;
import lombok.AllArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class Scheduler {
    private final DeliveryOrderService deliveryOrderService;

    @Scheduled(fixedRate = 60 * 1000 * 2)
    public void autoAssignDeliveryOrders(){
        deliveryOrderService.autoAssignDeliveryOrders();
    }
}
