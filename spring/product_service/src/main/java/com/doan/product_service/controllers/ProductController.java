package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.product.ProductRequest;
import com.doan.product_service.dtos.product.ProductResponse;
import com.doan.product_service.models.Product;
import com.doan.product_service.services.ProductService;
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
public class ProductController {
    private final ProductService productService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/products")
    public ResponseEntity<?> createProduct(@Valid @RequestBody ProductRequest productRequest){
        try {
            productService.createProduct(productRequest);
            return ResponseEntity.ok(new ApiResponse<>("Tạo sản phẩm thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/products")
    public ResponseEntity<?> getAllProducts(){
        try{
            List<Product> productList=productService.getAllProductsIncludingInactive();
            return ResponseEntity.ok(
                    new ApiResponse<>("Lấy danh sách sản phẩm thành công!",true,
                            productList.stream()
                                    .map(product -> new ProductResponse(
                                            product.getId(),
                                            product.getName(),
                                            product.getProductCode(),
                                            product.getSlug(),
                                            product.getDescription(),
                                            product.getShortDescription(),
                                            product.getCategory().getName(),
                                            product.getBrand().getName(),
                                            product.getTechnicalSpecs(),
                                            product.getImageUrl(),
                                            product.getIsActive(),
                                            product.getIsFeatured(),
                                            product.getCreatedAt()
                                    )
                            ).toList()));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest productRequest){
        try {
            productService.updateProduct(id,productRequest);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật sản phẩm thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/products/active/{id}")
    public ResponseEntity<?> changeProductActive(@PathVariable Long id){
        try {
            System.out.println(id);
            productService.changeProductActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi trạng thái thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/products/featured/{id}")
    public ResponseEntity<?> changeProductFeatured(@PathVariable Long id){
        try {
            System.out.println(id);
            productService.changeProductFeatured(id);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi nổi bật thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/secure/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id){
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa sản phẩm thành công!",true,  null));
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
