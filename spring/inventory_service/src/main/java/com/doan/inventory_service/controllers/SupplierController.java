package com.doan.inventory_service.controllers;

import com.doan.inventory_service.dtos.ApiResponse;
import com.doan.inventory_service.dtos.supplier.SupplierRequest;
import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.services.SupplierService;
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
public class SupplierController {
    private final SupplierService supplierService;
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/suppliers")
    public ResponseEntity<?> createSupplier(@Valid @RequestBody SupplierRequest request){
        try{
            Supplier supplier= supplierService.createSupplier(request);
            return  ResponseEntity.ok(new ApiResponse<>("Tạo nhà cung cấp thành công!",true,supplier));
        }catch (ResponseStatusException ex){
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/suppliers")
    public ResponseEntity<?> getSuppliers(){
        try{
            List<Supplier> supplierList= supplierService.getSuppliers();
            return  ResponseEntity.ok(new ApiResponse<>("Tạo nhà cung cấp thành công!",true,supplierList));
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
