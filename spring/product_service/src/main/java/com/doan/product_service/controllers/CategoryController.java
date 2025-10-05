package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.category.CategoryRequest;
import com.doan.product_service.models.Category;
import com.doan.product_service.models.Product;
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
public class CategoryController {
    private final CategoryService categoryService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/categories")
    public ResponseEntity<?> getAllProducts(){
        try{
            List<Category> categoryList=categoryService.getAllCategories();
            return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách danh mục thành công!",true,categoryList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/categories")
    public ResponseEntity<?> createCategory(@Valid @RequestBody CategoryRequest categoryRequest){
        try {
            categoryService.createCategory(categoryRequest);
            return ResponseEntity.ok(new ApiResponse<>("Tạo danh mục thành công!",true,  null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/categories/{id}")
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest categoryRequest){
        try {
            categoryService.updateCategory(id,categoryRequest);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật danh mục thành công!",true,  null));
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
    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
