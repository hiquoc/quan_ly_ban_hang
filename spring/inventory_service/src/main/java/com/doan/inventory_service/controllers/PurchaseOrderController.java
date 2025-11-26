package com.doan.inventory_service.controllers;

import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.purchase.PurchaseOrderRequest;
import com.doan.inventory_service.dtos.purchase.PurchaseOrderResponse;
import com.doan.inventory_service.dtos.purchase.UpdatePurchaseOrderStatusRequest;
import com.doan.inventory_service.services.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class PurchaseOrderController {
    private final PurchaseOrderService purchaseOrderService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/orders")
    public ResponseEntity<?> createPurchaseOrder(@Valid @RequestBody PurchaseOrderRequest request,
                                                 @RequestHeader("X-Owner-Id") Long staffId,
                                                 @RequestHeader("X-User-Role") String role,
                                                 @RequestHeader("X-Warehouse-Id") Long staffWarehouseId) {
        try {
            if(role.equals("STAFF")&&!Objects.equals(request.getWarehouseId(), staffWarehouseId))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền tạo đơn!");
            PurchaseOrderResponse response = purchaseOrderService.createPurchaseOrder(request, staffId);
            return ResponseEntity.ok(new ApiResponse<>("Tạo đơn hàng thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/orders")
    public ResponseEntity<?> getPurchaseOrders(
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-Warehouse-Id") Long staffWarehouseId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (role.equals("STAFF") && (warehouseId == null || !Objects.equals(warehouseId, staffWarehouseId)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem đơn!");
        try {
            OffsetDateTime start = startDate != null && !startDate.isBlank()
                    ? LocalDate.parse(startDate).atStartOfDay(ZoneOffset.UTC).toOffsetDateTime()
                    : null;
            OffsetDateTime end = endDate != null && !endDate.isBlank()
                    ? LocalDate.parse(endDate).atTime(23, 59, 59).atOffset(ZoneOffset.UTC)
                    : null;

            Page<PurchaseOrderResponse> responses = purchaseOrderService.getPurchaseOrders(page, size, status,keyword, warehouseId, start, end);
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách đơn hàng thành công!", true, responses));
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày không hợp lệ!");
        }
    }


    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/orders/{id}")
    public ResponseEntity<?> updatePurchaseOrder(@PathVariable Long id,
                                                 @Valid @RequestBody PurchaseOrderRequest request,
                                                 @RequestHeader("X-Owner-Id") Long staffId,
                                                 @RequestHeader("X-User-Role") String role,
                                                 @RequestHeader("X-Warehouse-Id") Long staffWarehouseId) {
        try {
            if(role.equals("STAFF")&&!Objects.equals(request.getWarehouseId(), staffWarehouseId))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền cập nhật đơn!");
            PurchaseOrderResponse response = purchaseOrderService.updatePurchaseOrder(id, request, staffId);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật đơn hàng thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/orders/{id}")
    public ResponseEntity<?> updatePurchaseOrderStatus(@PathVariable Long id,
                                                       @RequestBody UpdatePurchaseOrderStatusRequest request,
                                                       @RequestHeader("X-Owner-Id") Long staffId,
                                                       @RequestHeader("X-User-Role") String role,
                                                       @RequestHeader("X-Warehouse-Id") Long staffWarehouseId) {
        try {
            if (request.getStatus() == null || request.getStatus().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không được để trống");
            }
            String trimmedStatus = request.getStatus().replace("\"", "").trim();
            PurchaseOrderResponse response = purchaseOrderService.updatePurchaseOrderStatus(id, trimmedStatus, staffId,role,staffWarehouseId);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái đơn hàng thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/orders/{id}")
    public ResponseEntity<?> checkPurchaseOrderByVariantId(@PathVariable Long id) {
        try {
            Boolean exist = purchaseOrderService.checkPurchaseOrderByVariantId(id);
            return ResponseEntity.ok(exist);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }


    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
