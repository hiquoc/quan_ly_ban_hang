package com.doan.inventory_service.repositories.feign;

import com.doan.inventory_service.dtos.order.UpdateOrderStatusFromInvRequest;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
        name = "order-service",
        path = "/internal"
)
public interface OrderRepository {
    @PostMapping("/order/{orderNumber}/status")
    void updateOrderStatus( @PathVariable String orderNumber,
                                     @Valid @RequestBody UpdateOrderStatusFromInvRequest request);

}