package com.doan.inventory_service.controllers;

import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.supplier.SupplierRequest;
import com.doan.inventory_service.dtos.warehouse.WarehouseRequest;
import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.models.Warehouse;
import com.doan.inventory_service.services.SupplierService;
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
@RequestMapping("/secure/warehouses")
@AllArgsConstructor
public class WarehouseController {
    private final WarehouseService warehouseService;
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("")
    public ResponseEntity<?> createWarehouse(@Valid @RequestBody WarehouseRequest request){
        try{
            Warehouse warehouse= warehouseService.createWarehouse(request);
            return  ResponseEntity.ok(new ApiResponse<>("Tạo kho thành công!",true,warehouse));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("")
    public ResponseEntity<?> getWarehouses(){
        try{
            List<Warehouse> warehouseList= warehouseService.getWarehouses();
            return  ResponseEntity.ok(new ApiResponse<>("Lấy danh sách kho thành công!",true,warehouseList));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/{id}")
    public ResponseEntity<?> updateWarehouse(@PathVariable Long id,@Valid @RequestBody WarehouseRequest request){
        try{
            Warehouse warehouse= warehouseService.updateWarehouse(id,request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật kho thành công!",true,warehouse));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWarehouse(@PathVariable Long id){
        try{
            warehouseService.deleteWarehouse(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa kho thành công!",true,null));
        }catch (ResponseStatusException ex){
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
