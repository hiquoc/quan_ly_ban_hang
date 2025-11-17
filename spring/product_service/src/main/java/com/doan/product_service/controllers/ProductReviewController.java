package com.doan.product_service.controllers;

import com.doan.product_service.dtos.ApiResponse;
import com.doan.product_service.dtos.product_review.ProductReviewRequest;
import com.doan.product_service.dtos.product_review.ProductReviewResponse;
import com.doan.product_service.models.ProductReview;
import com.doan.product_service.repositories.ProductReviewRepository;
import com.doan.product_service.services.ProductReviewService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class ProductReviewController {
    public ProductReviewService productReviewService;

    @PostMapping("/secure/reviews")
    public ResponseEntity<?> createReview(@RequestHeader("X-Owner-Id") Long customerId,
                                          @RequestHeader("X-User-Name") String username,
                                          @RequestHeader("X-User-Role") String role,
                                          @Valid @RequestPart("review") ProductReviewRequest request,
                                          @RequestPart(value = "images", required = false) List<MultipartFile> images) {

        try {
            if (customerId == null || username == null || !role.equals("CUSTOMER")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền đánh giá sản phẩm!");
            }
            request.setCustomerId(customerId);
            request.setUsername(username);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu thành công!",true, productReviewService.createReview(request, images)));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }

    @GetMapping("/public/review/{productId}")
    public ResponseEntity<ProductReviewResponse> getReviewsByProduct(
            @PathVariable Long productId,
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            @RequestParam(required = false) Long ownerId
    ) {
        String[] sortParams = sort.split(",");
        String sortBy = sortParams[0];
        Sort.Direction direction = sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1])
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        if (!"createdAt".equals(sortBy) && !"rating".equals(sortBy)) {
            sortBy = "createdAt";
            direction = Sort.Direction.DESC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        ProductReviewResponse response = productReviewService.getProductReviewsWithCounts(productId, rating, pageable, ownerId, page);
        return ResponseEntity.ok(response);
    }


    @PutMapping("/secure/reviews/{id}")
    public ResponseEntity<?> updateProductReview(@PathVariable Long id,
                                                 @RequestHeader("X-Owner-Id") Long customerId,
                                                 @RequestHeader("X-User-Role") String role,
                                                 @RequestPart("review") ProductReviewRequest request,
                                                 @RequestParam(value = "newImages", required = false) List<MultipartFile> newImages,
                                                 @RequestParam(value = "deletedKeys", required = false) List<String> deletedKeys){
        try {
            if(newImages!=null || deletedKeys!=null)
                productReviewService.updateReviewImages(id,customerId,role, newImages, deletedKeys);
            productReviewService.updateReviewInfo(id,customerId,role,request);
            return ResponseEntity.ok(new ApiResponse<>("Cập nhật dữ liệu thành công!",true,null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PatchMapping("/secure/reviews/{id}")
    public ResponseEntity<?> updateProductIsApproved(@PathVariable Long id){
        try {
            productReviewService.updateReviewIsApproved(id);
            return ResponseEntity.noContent().build();
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @DeleteMapping("/secure/reviews/{id}")
    public ResponseEntity<?> deleteProductReview(@PathVariable Long id,
                                                 @RequestHeader("X-Owner-Id") Long customerId,
                                                     @RequestHeader("X-User-Role") String role){
        try {
            productReviewService.deleteProductReview(id,customerId,role);
            return ResponseEntity.ok(new ApiResponse<>("Xóa dữ liệu thành công!",true,null));
        } catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/secure/reviews/customer")
    public ResponseEntity<?> getCustomerReviews(@RequestHeader("X-Owner-Id") Long customerId){
        try{
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu thành công!",true,productReviewService.getCustomerReviews(customerId)));
        }catch (ResponseStatusException ex) {
            return errorResponse(ex);
        }
    }
    @GetMapping("/internal/reviews/recommend")
    public List<ProductReview> getProductRecommendData(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {

        LocalDate yesterday = LocalDate.now().minusDays(1);
        if (startDate == null) startDate = yesterday;
        if (endDate == null) endDate = yesterday;

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();

        return productReviewService.getAllReviews(startDateTime, endDateTime);
    }

    @GetMapping("/secure/reviews/recommend")
    public List<ProductReview> getProductRecommendDataSecure(@RequestParam(required = false) LocalDateTime startDate,
                                                       @RequestParam(required = false) LocalDateTime endDate) {
        return productReviewService.getAllReviews(startDate,endDate);
    }

    private ResponseEntity<Map<String, Object>> errorResponse(ResponseStatusException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("message", ex.getReason());
        error.put("success", false);
        return ResponseEntity.status(ex.getStatusCode()).body(error);
    }
}
