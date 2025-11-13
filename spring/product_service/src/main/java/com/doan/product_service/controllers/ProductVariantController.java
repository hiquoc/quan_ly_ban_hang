package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.product_variant.VariantRequest;
import com.doan.product_service.dtos.product_variant.VariantResponse;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.services.BrandService;
import com.doan.product_service.services.CategoryService;
import com.doan.product_service.services.ProductService;
import com.doan.product_service.services.ProductVariantService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
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
    public ResponseEntity<?> createProductVariant(@Valid @RequestPart("variant") VariantRequest request,
                                                  @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        try {
            VariantResponse variantResponse = productVariantService.createProductVariant(request, images);
            return ResponseEntity.ok(new ApiResponse<>("Tạo biến thể thành công!", true, variantResponse));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/variants")
    public ResponseEntity<?> getAllProductVariantsIncludingInactive(@RequestParam(required = false) Integer page,
                                                                    @RequestParam(required = false) Integer size,
                                                                    @RequestParam(required = false) Long productId,
                                                                    @RequestParam(required = false) String keyword,
                                                                    @RequestParam(required = false) Boolean active,
                                                                    @RequestParam(required = false) String status,
                                                                    @RequestParam(required = false) Boolean discount,
                                                                    @RequestParam(required = false) BigDecimal minPrice,
                                                                    @RequestParam(required = false) BigDecimal maxPrice) {
        try {
            Page<VariantResponse> list = productVariantService.getAllProductsIncludingInactive(page, size, productId, keyword, active, status, discount, minPrice, maxPrice);
            return ResponseEntity.ok(new ApiResponse<>("Lấy biến thể thành công!",
                    true, list));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/variants/{id}")
    public ResponseEntity<?> getProductVariantIncludingInactive(@PathVariable Long id) {
        try {
            VariantResponse response = productVariantService.getProductIncludingInactive(id);
            return ResponseEntity.ok(new ApiResponse<>("Lấy biến thể thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/variants/by-ids")
    public ResponseEntity<?> getVariantByIdsSecure(@RequestParam List<Long> ids) {
        try {
            List<VariantResponse> responses = productVariantService.getVariantByIds(ids);
            return ResponseEntity.ok(new ApiResponse<>("Lấy biến thể thành công!", true, responses));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/secure/variants/{id}")
    public ResponseEntity<?> updateVariantInfo(
            @PathVariable Long id,
            @RequestBody @Valid VariantRequest request
    ) {
        try {
            VariantResponse response = productVariantService.updateVariantInfo(id, request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật thông tin thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new ApiResponse<>("Lỗi máy chủ khi cập nhật thông tin biến thể", false, null));
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping(value = "/secure/variants/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateVariantImages(
            @PathVariable Long id,
            @RequestParam(value = "newImages", required = false) List<MultipartFile> newImages,
            @RequestParam(value = "deletedKeys", required = false) List<String> deletedKeys,
            @RequestParam(value = "newMainKey", required = false) String newMainKey
    ) {
        try {
            VariantResponse response = productVariantService.updateVariantImages(id, newImages, deletedKeys, newMainKey);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật hình ảnh thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(new ApiResponse<>("Lỗi máy chủ khi cập nhật hình ảnh biến thể", false, null));
        }
    }


    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/secure/variants/active/{id}")
    public ResponseEntity<?> changeProductVariantActive(@PathVariable Long id) {
        try {
            productVariantService.changeProductVariantActive(id);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi trạng thái thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }


    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/secure/variants/{id}")
    public ResponseEntity<?> deleteProductVariant(@PathVariable Long id) {
        try {
            productVariantService.deleteProductVariant(id);
            return ResponseEntity.ok(new ApiResponse<>("Xóa biến thể thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/variants/search")
    public List<Long> searchVariantIds(@RequestParam String code) {
        return productVariantService.findByCodeContainingIgnoreCase(code)
                .stream()
                .map(ProductVariant::getId)
                .toList();
    }

    @GetMapping("/internal/variants/{id}/active")
    public ResponseEntity<?> getProductVariantFromInternalExcludingInactive(@PathVariable Long id) {
        try {
            VariantResponse response = productVariantService.getProductExcludingInactive(id);
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/internal/variants/{id}/importPrice")
    public ResponseEntity<?> updateVariantImportPrice(
            @PathVariable Long id,
            @RequestParam int currentStock,
            @RequestParam int newStock,
            @RequestParam BigDecimal importPrice
    ) {
        try {
            productVariantService.updateVariantImportPrice(id, currentStock, newStock, importPrice);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật giá nhập của biến thể thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/internal/variants/{id}/sold")
    public ResponseEntity<?> updateVariantSold(
            @PathVariable Long id,
            @RequestParam int num
    ) {
        try {
            productVariantService.updateVariantSoldCount(id, num);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật lượt bán của biến thể thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @PostMapping("/internal/variants/status/{id}")
    public ResponseEntity<?> changeProductVariantStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            productVariantService.changeProductVariantStatus(id, status);
            return ResponseEntity.ok(new ApiResponse<>("Thay đổi khả dụng thành công!", true, null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/variants/{id}")
    public ResponseEntity<?> getProductVariantFromInternal(@PathVariable Long id) {
        try {
            VariantResponse response = productVariantService.getProductIncludingInactive(id);
            return ResponseEntity.ok(new ApiResponse<>("Lấy biến thể thành công!", true, response));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/internal/variants")
    public List<VariantResponse> getVariantByIds(@RequestParam List<Long> ids) {
        return productVariantService.getVariantByIds(ids);
    }


    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }


}
