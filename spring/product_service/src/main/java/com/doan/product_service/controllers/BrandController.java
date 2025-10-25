package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.brand.BrandRequest;
import com.doan.product_service.dtos.category.CategoryRequest;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Category;
import com.doan.product_service.services.BrandService;
import com.doan.product_service.services.CategoryService;
import com.doan.product_service.services.ProductService;
import com.doan.product_service.services.ProductVariantService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class BrandController {
    private final ProductService productService;
    private final ProductVariantService productVariantService;
    private final BrandService brandService;
    private final CategoryService categoryService;

    @GetMapping("/public/brands")
    public ResponseEntity<?> getAllActiveBrands(@RequestParam(required = false) Integer page,
                                                           @RequestParam(required = false) Integer size,
                                                           @RequestParam(required = false) String keyword){
        try{
            Page<Brand> brandList=brandService.getAllBrands(page,size,keyword,true);
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách thương hiệu thành công!",true,brandList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/brands")
    public ResponseEntity<?> getAllBrandsIncludingInActive(@RequestParam(required = false) Integer page,
                                                           @RequestParam(required = false) Integer size,
                                                           @RequestParam(required = false) String keyword,
                                                           @RequestParam(required = false) Boolean active){
        try{
            Page<Brand> brandList=brandService.getAllBrands(page,size,keyword,active);
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách thương hiệu thành công!",true,brandList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/brands")
    public ResponseEntity<?> createBrand(@RequestPart("brand") @Valid BrandRequest brandRequest,
                                         @RequestPart(value = "image", required = false) MultipartFile image){
        try {
            brandService.createBrand(brandRequest,image);
            return ResponseEntity.ok(new ApiResponse<>("Tạo thương hiệu thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/brands/{id}")
    public ResponseEntity<?> updateBrand(@PathVariable Long id, @RequestPart("brand") @Valid BrandRequest brandRequest,
                                         @RequestPart(value = "image", required = false) MultipartFile image){
        try {
            brandService.updateBrand(id,brandRequest,image);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật thương hiệu thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/brands/active/{id}")
    public ResponseEntity<?> changeBrandActive(@PathVariable Long id){
        try {
            brandService.changeBrandActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/secure/brands/{id}")
    public ResponseEntity<?> deleteBrand(@PathVariable Long id){
        try {
            brandService.deleteBrand(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa thương hiệu thành công!",true,  null));
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
