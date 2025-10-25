package com.doan.inventory_service.repositories.feign;

import com.doan.inventory_service.dtos.order.UpdateOrderStatusFromInvRequest;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
        name = "order-service",
        path = "/orders"
)
public interface OrderRepository {
    @PostMapping("/internal/order/{orderNumber}/shipped")
    void updateOrderStatus( @PathVariable String orderNumber,
                                     @Valid @RequestBody UpdateOrderStatusFromInvRequest request);

}