package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.brand.BrandRequest;
import com.doan.product_service.dtos.category.CategoryRequest;
import com.doan.product_service.dtos.other.PageCacheWrapper;
import com.doan.product_service.models.Category;
import com.doan.product_service.models.Product;
import com.doan.product_service.services.BrandService;
import com.doan.product_service.services.CategoryService;
import com.doan.product_service.services.ProductService;
import com.doan.product_service.services.ProductVariantService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class CategoryController {
    private final CategoryService categoryService;

    @GetMapping("/public/categories")
    public ResponseEntity<?> getAllActiveCategories(@RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size,
                                            @RequestParam(required = false) String keyword){
        try{
            PageCacheWrapper<Category> categoryPage = categoryService.getAllCategories(page, size, keyword, true);
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách danh mục thành công!", true, categoryPage));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/categories")
    public ResponseEntity<?> getAllCategories(@RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size,
                                            @RequestParam(required = false) String keyword,
                                            @RequestParam(required = false) Boolean active){
        try{
            PageCacheWrapper<Category> categoryList=categoryService.getAllCategories(page,size,keyword,active);
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách danh mục thành công!",true,categoryList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/categories")
    public ResponseEntity<?> createCategory(@RequestPart("category") @Valid CategoryRequest categoryRequest,
                                            @RequestPart(value = "image", required = false) MultipartFile image){
        try {
            return ResponseEntity.ok(new ApiResponse<>("Tạo danh mục thành công!",true,  categoryService.createCategory(categoryRequest,image)));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestPart("category") @Valid CategoryRequest categoryRequest,
                                            @RequestPart(value = "image", required = false) MultipartFile image){
        try {
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật danh mục thành công!",true,  categoryService.updateCategory(id,categoryRequest,image)));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/categories/active/{id}")
    public ResponseEntity<?> changeCategoryActive(@PathVariable Long id){
        try {
            categoryService.changeCategoryActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/secure/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id){
        try {
            categoryService.deleteCategory(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa doanh mục thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/categories")
    public List<Category> getCategoriesByIds(@RequestParam List<Long> ids){
        return categoryService.getCategoriesByIds(ids);
    }
    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
