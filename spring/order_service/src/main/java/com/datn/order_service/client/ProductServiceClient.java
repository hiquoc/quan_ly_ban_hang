package com.datn.order_service.client;

import com.datn.order_service.client.dto.VariantDTO;
import com.datn.order_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@FeignClient(name = "product-service")
public interface ProductServiceClient {

    @GetMapping("/internal/variants/{id}/active")
    ResponseEntity<VariantDTO> getVariant(@PathVariable("id") Long id);
}