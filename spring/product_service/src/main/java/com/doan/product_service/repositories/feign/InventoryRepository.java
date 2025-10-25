package com.doan.product_service.repositories.feign;

import com.doan.product_service.dtos.inventory.InventoryResponseForVariant;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "inventory-service",
    path = "/internal"
)
public interface InventoryRepository {

    @GetMapping("/inventories/{id}")
    ResponseEntity<List<InventoryResponseForVariant>> getInventoriesFromVariantIds(@RequestParam List<Long> variantIds);

    @GetMapping("/orders/{id}")
    public ResponseEntity<Boolean> checkPurchaseOrderByVariantId(@PathVariable Long id);
}