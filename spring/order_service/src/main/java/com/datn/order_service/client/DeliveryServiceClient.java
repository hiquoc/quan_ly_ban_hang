package com.datn.order_service.client;

import com.datn.order_service.dto.request.CancelDeliveryOrderRequest;
import com.datn.order_service.dto.request.DeliveryOrderRequest;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "delivery-service")
public interface DeliveryServiceClient {
    @PostMapping("/internal/deliveries")
    void createDeliveryOrder(@RequestBody @Valid DeliveryOrderRequest request);

    @DeleteMapping("/internal/deliveries/{id}")
    void deleteDeliveryOrder(@PathVariable Long id);

    @PostMapping("/internal/deliveries/cancel")
    void cancelDeliveryOrderStatus(@RequestBody @Valid CancelDeliveryOrderRequest request);
}
