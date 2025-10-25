package com.datn.cart_service.client;

import com.datn.cart_service.dto.VariantDTO;
import com.datn.cart_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "product-service")
public interface ProductServiceClient {
    @GetMapping("/internal/variants/{id}/active")
    ResponseEntity<VariantDTO> getVariant(@PathVariable("id") Long id);}