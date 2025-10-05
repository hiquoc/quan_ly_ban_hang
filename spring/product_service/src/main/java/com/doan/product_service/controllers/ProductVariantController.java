package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.product.ProductRequest;
import com.doan.product_service.dtos.product_variant.VariantRequest;
import com.doan.product_service.dtos.product_variant.VariantResponse;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.services.BrandService;
import com.doan.product_service.services.CategoryService;
import com.doan.product_service.services.ProductService;
import com.doan.product_service.services.ProductVariantService;
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
public class ProductVariantController {
    private final ProductService productService;
    private final ProductVariantService productVariantService;
    private final BrandService brandService;
    private final CategoryService categoryService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/variants")
    public ResponseEntity<?> createProductVariant(@Valid @RequestBody VariantRequest request){
        try {
            productVariantService.createProductVariant(request);
            return ResponseEntity.ok(new ApiResponse<>("Tạo biến thể thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/variants")
    public ResponseEntity<?> getAllProductVariants(){
        try{
            List<ProductVariant> list=productVariantService.getAllProductsIncludingInactive();
            return ResponseEntity.ok(new ApiResponse<>("Lấy biến thể thành công!",
                    true,list.stream().map(
                            productVariant -> new VariantResponse(
                                    productVariant.getId(),
                                    productVariant.getProduct().getId(),
                                    productVariant.getProduct().getName(),
                                    productVariant.getName(),
                                    productVariant.getSku(),
                                    productVariant.getImportPrice(),
                                    productVariant.getSellingPrice(),
                                    productVariant.getDiscountPercent(),
                                    productVariant.getAttributes(),
                                    productVariant.getImageUrls(),
                                    productVariant.getSoldCount(),
                                    productVariant.getIsActive(),
                                    productVariant.getCreatedAt(),
                                    productVariant.getUpdatedAt()
                            )).toList()
            ));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/variants/{id}")
    public ResponseEntity<?> updateProductVariant(@PathVariable Long id, @Valid @RequestBody VariantRequest request){
        try {
            System.out.println(request.getImageUrls());
            productVariantService.updateProductVariant(id,request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật biến thể thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/variants/active/{id}")
    public ResponseEntity<?> changeProductVariantActive(@PathVariable Long id){
        try {
            productVariantService.changeProductVariantActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi trạng thái thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/secure/variants/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id){
        try {
            productVariantService.deleteProductVariant(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa biến thể thành công!",true,  null));
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
