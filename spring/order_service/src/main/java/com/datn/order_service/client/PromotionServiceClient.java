package com.datn.order_service.client;

import com.datn.order_service.client.dto.request.ValidatePromotionRequest;
import com.datn.order_service.client.dto.response.PromotionValidationResponse;
import com.datn.order_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "promotion-service")
public interface PromotionServiceClient {

    @PostMapping("/promotions/validate")
    ApiResponse<PromotionValidationResponse> validatePromotion(
            @RequestBody ValidatePromotionRequest request);

    @PostMapping("/promotions/{id}/usage/{orderId}")
    ApiResponse<Void> recordUsage(
            @PathVariable("id") Long id,
            @PathVariable("orderId") Long orderId,
            @RequestHeader("X-Account-Id") Long customerId);
}