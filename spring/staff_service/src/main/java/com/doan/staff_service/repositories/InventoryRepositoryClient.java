package com.doan.staff_service.repositories;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(
        name = "inventory-service",
        path = "/internal"
)
public interface InventoryRepositoryClient {

    @GetMapping("/warehouses/{id}")
    Boolean checkWarehouseId(@PathVariable Long id);
}