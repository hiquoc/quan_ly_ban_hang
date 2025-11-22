package com.doan.delivery_service.repositories.feign;


import com.doan.delivery_service.dtos.ApiResponse;
import com.doan.delivery_service.dtos.inventory.OrderTransactionRequest;
import com.doan.delivery_service.dtos.inventory.ReturnedOrderTransactionRequest;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@FeignClient(name = "inventory-service")
public interface InventoryRepositoryClient {

    @PostMapping("/internal/transactions")
    ResponseEntity<ApiResponse<Void>> createOrderTransaction(@Valid @RequestBody List<OrderTransactionRequest> request);

    @PostMapping("/internal/transactions/return/")
    ResponseEntity<ApiResponse<Void>> createReturnOrderTransaction(@Valid @RequestBody ReturnedOrderTransactionRequest request);
}