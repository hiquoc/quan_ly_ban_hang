package com.doan.inventory_service.controllers;


import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.inventory.InventoryQuantityChangeResponse;
import com.doan.inventory_service.dtos.inventory.InventoryResponse;
import com.doan.inventory_service.dtos.inventory.InventoryResponseForVariant;
import com.doan.inventory_service.dtos.transaction.*;
import com.doan.inventory_service.services.InventoryService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@AllArgsConstructor
@RestController
@RequestMapping("")
public class InventoryController {
    private final InventoryService inventoryService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/inventories")
    public ResponseEntity<?> searchInventories(@RequestParam(required = false) Integer page,
                                               @RequestParam(required = false) Integer size,
                                               @RequestParam(required = false) String keyword,
                                               @RequestParam(required = false) Long warehouseId,
                                               @RequestParam(required = false) Boolean active) {
        try {
            Page<InventoryResponse> inventories = inventoryService.searchInventories(page, size, keyword, warehouseId, active);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu kho hàng thành công!", true, inventories));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/inventories/{id}")
    public ResponseEntity<?> changeItemActive(@PathVariable Long id) {
        try {
            inventoryService.changeItemActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/secure/transactions")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    public ResponseEntity<?> getTransactions(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String keywordType,
            @RequestParam(required = false) Boolean ignoreReserveRelease,
            @RequestParam(required = false) Long warehouseId
    ) {
        try {
            LocalDate start = (startDate != null && !startDate.isBlank()) ? LocalDate.parse(startDate) : null;
            LocalDate end = (endDate != null && !endDate.isBlank()) ? LocalDate.parse(endDate) : null;

            Page<InventoryTransactionResponse> transactions = inventoryService.getTransactions(
                    page, size, status, type, start, end, keyword, keywordType, ignoreReserveRelease,warehouseId);

            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu phiếu thành công!", true, transactions));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }


    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/transactions/{variantId}")
    public ResponseEntity<?> getTransactionOfAnInventory(
            @PathVariable Long variantId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        try {
            LocalDate start = null;
            LocalDate end = null;

            if (startDate != null && !startDate.isBlank()) {
                try {
                    start = LocalDate.parse(startDate); // expects "yyyy-MM-dd"
                } catch (DateTimeParseException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu không hợp lệ!");
                }
            }
            if (endDate != null && !endDate.isBlank()) {
                try {
                    end = LocalDate.parse(endDate);
                } catch (DateTimeParseException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc không hợp lệ!");
                }
            }
            Page<InventoryTransactionResponse> transactions = inventoryService.getTransaction(variantId, page, size, start, end);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu phiếu thành công!", true, transactions));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/transactions")
    public ResponseEntity<?> createTransactions(@Valid @RequestBody InventoryTransactionRequest request,
                                                @RequestHeader("X-Owner-Id") Long staffId) {
        try {
            InventoryTransactionResponse response= inventoryService.createTransactions(Collections.singletonList(request), staffId);
            return ResponseEntity.ok(new ApiResponse<>("Tạo phiếu phiếu thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/transactions/{id}")
    public ResponseEntity<?> updateTransactionStatus(@PathVariable Long id, @RequestBody UpdateTransactionStatusRequest request,
                                                     @RequestHeader("X-Owner-Id") Long staffId) {
        try {
            inventoryService.updateTransactionStatus(id, request.getStatus().replace("\"", "").trim(), request.getNote(), staffId);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái phiếu thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/inventories/variantId/{id}")
    public ResponseEntity<?> searchInventories(@PathVariable Long id) {
        try {
            List<InventoryResponse> inventories = inventoryService.searchInventoryByVariantId(id);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu kho hàng thành công!", true, inventories));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/secure/inventories/warning")
    public ResponseEntity<?> getInventoriesOrderByAvailableStock(@RequestParam(required = false) Integer page,
                                                                 @RequestParam(required = false) Integer size) {
        try {
            Page<InventoryResponse> inventories = inventoryService.getInventoriesOrderByAvailableStock(page, size);
            return ResponseEntity.ok(inventories);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/secure/inventory-quantity/{id}")
    public ResponseEntity<InventoryQuantityChangeResponse> getInventoryQuantityChanges(
            @PathVariable Long id,
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to) {

        InventoryQuantityChangeResponse response = inventoryService.calculateNumOfItemWithDailyChanges(id, from, to);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/internal/transactions")
    public ResponseEntity<?> createOrderTransaction(@RequestBody List<OrderTransactionRequest> request) {
        try {
            inventoryService.createOrderTransaction(request);
            return ResponseEntity.ok(new ApiResponse<>("Tạo phiếu thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PostMapping("/internal/transactions/return/")
    public ResponseEntity<?> createReturnOrderTransaction(@RequestBody ReturnedOrderTransactionRequest request) {
        try {
            inventoryService.createTransactionForReturnedDelivery(request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái phiếu thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/internal/transactions/reserve")
    public ResponseEntity<?> reserveStock(@RequestBody ReserveStockRequest request) {
        try {
            inventoryService.reserveStock(request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật số lượng sản phẩm khả dụng thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/internal/transactions/reserve/{orderNumber}")
    public ResponseEntity<?> releaseStock(@PathVariable String orderNumber,
                                          @RequestBody ReleaseStockRequest request) {
        try {
            inventoryService.releaseStock(orderNumber, request.getReason(), true);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật số lượng sản phẩm khả dụng thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/inventories")
    public ResponseEntity<?> getInventoriesByVariantIds(
            @RequestParam List<Long> variantIds) {
        try {
            List<InventoryResponseForVariant> inventories = inventoryService.getInventoriesByVariantIds(variantIds);
            return ResponseEntity.ok(inventories);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/{variantId}/availableQuantity")
    public ResponseEntity<?> getAvailableQuantity(
            @PathVariable Long variantId) {
        try {
            Integer quantity = inventoryService.getAvailableQuantity(variantId);
            return ResponseEntity.ok(quantity);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/orders/{orderNumber}/warehouse-ids")
    public List<Long> getItemsWarehouseId(@PathVariable String orderNumber) {
        return inventoryService.getItemsWarehouseId(orderNumber);
    }


    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
