package com.datn.order_service.client;

import com.datn.order_service.client.dto.request.OrderTransactionRequest;
import com.datn.order_service.client.dto.request.ReleaseStockRequest;
import com.datn.order_service.client.dto.request.ReserveStockRequest;
import com.datn.order_service.dto.response.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "inventory-service")
public interface InventoryServiceClient {

    @PostMapping("/internal/transactions/reserve")
    ApiResponse<Void> reserveStock(@RequestBody ReserveStockRequest request);

    @PostMapping("/internal/transactions/reserve/{orderNumber}")
    ApiResponse<Void> releaseStock(@PathVariable String orderNumber,@RequestBody ReleaseStockRequest request);

    @PostMapping("/internal/transactions")
    ApiResponse<Void> createOrderTransaction(@RequestBody OrderTransactionRequest request);
}