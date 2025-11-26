package com.doan.inventory_service.controllers;

import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.warehouse.WarehouseRequest;
import com.doan.inventory_service.models.Warehouse;
import com.doan.inventory_service.services.WarehouseService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class WarehouseController {
    private final WarehouseService warehouseService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/secure/warehouses")
    public ResponseEntity<?> createWarehouse(@Valid @RequestBody WarehouseRequest request,
                                             @RequestHeader("X-User-Role") String role) {
        try {
            Warehouse warehouse = warehouseService.createWarehouse(request);
            return ResponseEntity.ok(new ApiResponse<>("Tạo kho thành công!", true, warehouse));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/warehouses")
    public ResponseEntity<?> getWarehouses() {
        try {
            List<Warehouse> warehouseList = warehouseService.getWarehouses();
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách kho thành công!", true, warehouseList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PutMapping("/secure/warehouses/{id}")
    public ResponseEntity<?> updateWarehouse(@PathVariable Long id, @Valid @RequestBody WarehouseRequest request,
                                             @RequestHeader("X-User-Role") String role) {
        try {
            Warehouse warehouse = warehouseService.updateWarehouse(id, request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật kho thành công!", true, warehouse));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @DeleteMapping("/secure/warehouses/{id}")
    public ResponseEntity<?> deleteWarehouse(@PathVariable Long id,
                                             @RequestHeader("X-User-Role") String role) {
        try {
            warehouseService.deleteWarehouse(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa kho thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/warehouses/{id}")
    public Boolean checkWarehouseId(@PathVariable Long id) {
        return warehouseService.checkWarehouseId(id);
    }

    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
