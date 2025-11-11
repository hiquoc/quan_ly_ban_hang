package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.other.HomeRequest;
import com.doan.product_service.dtos.other.HomeResponse;
import com.doan.product_service.dtos.product.ProductDetailsResponse;
import com.doan.product_service.dtos.product.ProductRequest;
import com.doan.product_service.dtos.product.ProductResponse;
import com.doan.product_service.dtos.product_variant.VariantResponse;
import com.doan.product_service.services.ProductDashboardService;
import com.doan.product_service.services.ProductService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class ProductController {
    private final ProductService productService;
    private final ProductDashboardService dashboardService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping("/secure/products")
    public ResponseEntity<?> createProduct(@RequestPart("product") @Valid ProductRequest productRequest,
                                           @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            ProductResponse response= productService.createProduct(productRequest, image);
            return ResponseEntity.ok(new ApiResponse<>("Tạo sản phẩm thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/public/home")
    public ResponseEntity<?> getHomeProduct(@ModelAttribute HomeRequest request) {
        try {
            Page<ProductResponse> newProductList = productService.getAllProducts(0, request.getNewProduct(), null, null, null, true, null, null, null, null, null, null, true);
            Page<ProductResponse> hotProductList = productService.getAllProducts(0, request.getHotProduct(), null, null, null, true, null, null, "sold", null, null, null, true);
            Page<ProductResponse> featuredProductList = productService.getAllProducts(0, request.getFeaturedProduct(), null, null, null, true, true, null, null, null, null, null, true);
            Page<ProductResponse> discountProductList = productService.getAllProducts(0, request.getDiscountProduct(), null, null, null, true, null, null, null, true, null, null, true);

            HomeResponse response = new HomeResponse(
                    newProductList.getContent(),
                    hotProductList.getContent(),
                    featuredProductList.getContent(),
                    discountProductList.getContent()
            );

            return ResponseEntity.ok(
                    new ApiResponse<>("Lấy dữ liệu thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/products")
    public ResponseEntity<?> getAllProductsIncludingInactive(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<String> categoryName,
            @RequestParam(required = false) List<String> brandName,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean desc,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) Boolean discount) {
        try {
            Page<ProductResponse> productList = productService.getAllProducts(page, size, keyword, categoryName, brandName, active, featured, desc, sortBy, discount, null, null, null);
            return ResponseEntity.ok(
                    new ApiResponse<>("Lấy danh sách sản phẩm thành công!", true, productList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/public/products")
    public ResponseEntity<?> getAllActiveProducts(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<String> categoryName,
            @RequestParam(required = false) List<String> brandName,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean desc,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) Boolean discount,
            @RequestParam(required = false) Long startPrice,
            @RequestParam(required = false) Long endPrice) {
        try {
            Page<ProductResponse> productList = productService.getAllProducts(page, size, keyword, categoryName, brandName, true, featured, desc, sortBy, discount, startPrice, endPrice, true);
            return ResponseEntity.ok(
                    new ApiResponse<>("Lấy danh sách sản phẩm thành công!", true, productList));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/products/{id}/variants")
    public ResponseEntity<?> getProductVariantByProductId(@PathVariable Long id) {
        try {
            List<VariantResponse> response = productService.getProductVariantByProductId(id);
            return ResponseEntity.ok(new ApiResponse<>("Lấy biến thể thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/public/products/{slug}")
    public ResponseEntity<?> getActiveProductDetails(@PathVariable String slug) {
        try {
            ProductDetailsResponse response = productService.getActiveProductDetails(slug,false);
            return ResponseEntity.ok(new ApiResponse<>("Lấy sản phẩm thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/secure/products/{slug}")
    public ResponseEntity<?> getProductDetails(@PathVariable String slug) {
        try {
            ProductDetailsResponse response = productService.getActiveProductDetails(slug,true);
            return ResponseEntity.ok(new ApiResponse<>("Lấy sản phẩm thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/public/products-random/category/{categorySlug}")
    public ResponseEntity<?> getRandomActiveProductByCategory(@PathVariable String categorySlug) {
        try {
            List<ProductResponse> response = productService.getRandomActiveProductByCategory(categorySlug);
            return ResponseEntity.ok(new ApiResponse<>("Lấy sản phẩm thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestPart("product") @Valid ProductRequest productRequest,
                                           @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            productService.updateProduct(id, productRequest, image);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật sản phẩm thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/products/active/{id}")
    public ResponseEntity<?> changeProductActive(@PathVariable Long id) {
        try {
            productService.changeProductActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi trạng thái thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/products/featured/{id}")
    public ResponseEntity<?> changeProductFeatured(@PathVariable Long id) {
        try {
            productService.changeProductFeatured(id);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi nổi bật thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/secure/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        try {
            productService.deleteProduct(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa sản phẩm thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/dashboard")
    public ResponseEntity<Object> getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        if (from == null || to == null) {
            from = LocalDate.now().minusDays(30).atStartOfDay();
            to = LocalDate.now().atTime(LocalTime.MAX);
        }

        Object response = dashboardService.getDashboard(from, to);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/internal/products")
    public List<ProductResponse> getProductsByIds(@RequestParam List<Long> ids) {
        return productService.getProductsByIds(ids);
    }

    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }

}
