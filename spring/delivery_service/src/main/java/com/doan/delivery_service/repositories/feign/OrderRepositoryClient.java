package com.doan.delivery_service.repositories.feign;

import com.doan.delivery_service.dtos.order.UpdateOrderStatusRequest;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "order-service",
        path = "/internal"
)
public interface OrderRepositoryClient {
    @PostMapping("/order/status")
    void updateOrderStatus(@Valid @RequestBody UpdateOrderStatusRequest request);

}