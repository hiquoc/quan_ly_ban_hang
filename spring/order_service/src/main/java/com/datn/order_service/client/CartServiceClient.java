package com.datn.order_service.client;

import com.datn.order_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "cart-service")
public interface CartServiceClient {

    @DeleteMapping("/internal/customer")
    ApiResponse<Void> clearCart(@RequestHeader("X-Owner-Id") Long customerId);

    @DeleteMapping("/internal/customer/variant/{variantId}")
    ApiResponse<Void> removeCartItem(
            @RequestHeader("X-Owner-Id") Long customerId,
            @PathVariable("variantId") Long variantId);

}