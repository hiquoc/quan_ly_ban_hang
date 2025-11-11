package com.datn.order_service.client;

import com.datn.order_service.client.dto.request.ValidatePromotionRequest;
import com.datn.order_service.client.dto.response.PromotionValidationResponse;
import com.datn.order_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "promotion-service")
public interface PromotionServiceClient {

    @PostMapping("/internal/validate")
    ApiResponse<PromotionValidationResponse> validatePromotion(
            @RequestBody ValidatePromotionRequest request);

    @PostMapping("/internal/usage")
    ResponseEntity<ApiResponse<Void>> recordPromotionUsage(
            @RequestParam Long id,
            @RequestParam Long customerId,
            @RequestParam Long orderId);
}