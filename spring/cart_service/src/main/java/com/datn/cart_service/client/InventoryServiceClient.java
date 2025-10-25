package com.datn.cart_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "inventory-service")
public interface InventoryServiceClient {
    @GetMapping("/internal/{variantId}/availableQuantity")
    ResponseEntity<Integer> getAvailableQuantity(@PathVariable Long variantId);
}