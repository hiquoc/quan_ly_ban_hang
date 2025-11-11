package com.doan.product_service.repositories.feign;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.inventory.InventoryResponseForVariant;
import com.doan.product_service.dtos.order.OrderDetailResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(
    name = "order-service",
    path = "/internal"
)
public interface OrderRepository {
    @GetMapping("/order/{orderId}")
    ResponseEntity<ApiResponse<OrderDetailResponse>> getOrder(@PathVariable Long orderId);
}