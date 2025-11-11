package com.datn.promotion_service.controller;

import com.datn.promotion_service.dto.request.CreatePromotionRequest;
import com.datn.promotion_service.dto.request.UpdatePromotionRequest;
import com.datn.promotion_service.dto.request.ValidatePromotionRequest;
import com.datn.promotion_service.dto.response.ApiResponse;
import com.datn.promotion_service.dto.response.PromotionDetailResponse;
import com.datn.promotion_service.dto.response.PromotionResponse;
import com.datn.promotion_service.dto.response.PromotionValidationResponse;
import com.datn.promotion_service.entity.PromotionUsage;
import com.datn.promotion_service.service.PromotionService;
import com.datn.promotion_service.service.PromotionValidationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;
    private final PromotionValidationService validationService;

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PostMapping
    public ResponseEntity<ApiResponse<PromotionResponse>> createPromotion(
            @Valid @RequestBody CreatePromotionRequest request,
            @RequestHeader("X-Owner-Id") Long staffId) {
        request.setCreatedByStaffId(staffId);
        PromotionResponse response = promotionService.createPromotion(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Tạo khuyến mãi thành công!", true, response));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PromotionResponse>> updatePromotion(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdatePromotionRequest request) {
        PromotionResponse response = promotionService.updatePromotion(id, request);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật khuyến mãi thành công!", true, response));
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PromotionResponse>> updatePromotionActive(
            @PathVariable("id") Long id) {
        PromotionResponse response = promotionService.updatePromotionActive(id);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật khuyến mãi thành công!", true, response));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PromotionDetailResponse>> getPromotionById(
            @PathVariable("id") Long id) {
        PromotionDetailResponse response = promotionService.getPromotionById(id);
        return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin khuyến mãi thành công!", true, response));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<PromotionDetailResponse>> getPromotionByCode(
            @PathVariable("code") String code) {
        PromotionDetailResponse response = promotionService.getPromotionByCode(code);
        return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin khuyến mãi thành công!", true, response));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PromotionResponse>>> getAllPromotions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            Pageable pageable
    ) {
        Page<PromotionResponse> response = promotionService.getAllPromotions(keyword, isActive, pageable);
        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách khuyến mãi thành công!", true, response));
    }


    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getActivePromotions() {
        List<PromotionResponse> response = promotionService.getActivePromotions();
        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách khuyến mãi đang hoạt động thành công!", true, response));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<PromotionResponse>>> getUpcomingPromotions() {
        List<PromotionResponse> response = promotionService.getUpcomingPromotions();
        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách khuyến mãi sắp diễn ra thành công!", true, response));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePromotion(@PathVariable("id") Long id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.ok(new ApiResponse<>("Xóa khuyến mãi thành công!", true, null));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<PromotionResponse>> togglePromotionStatus(@PathVariable("id") Long id) {
        PromotionResponse response = promotionService.togglePromotionStatus(id);
        return ResponseEntity.ok(new ApiResponse<>("Thay đổi trạng thái khuyến mãi thành công!", true, response));
    }

    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<PromotionValidationResponse>> validatePromotion(
            @RequestHeader(value = "X-Owner-Id",required = false) Long customerId,
            @Valid @RequestBody ValidatePromotionRequest request) {
        if(customerId!=null)
            request.setCustomerId(customerId);
        if(request.getCustomerId()==null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Vui lòng đăng nhập!");
        PromotionValidationResponse response = validationService.validateAndCalculate(request);
        return ResponseEntity.ok(new ApiResponse<>("Kiểm tra mã khuyến mãi thành công!", true, response));
    }

    @GetMapping("/check/{code}")
    public ResponseEntity<ApiResponse<Boolean>> checkPromotionCode(@PathVariable("code") String code) {
        boolean isValid = validationService.isPromotionCodeValid(code);
        return ResponseEntity.ok(new ApiResponse<>("Kiểm tra mã thành công!", true, isValid));
    }

    @PostMapping("/internal/usage")
    public ResponseEntity<ApiResponse<Void>> recordPromotionUsage(
            @RequestParam Long id,
            @RequestParam Long customerId,
            @RequestParam Long orderId) {
        promotionService.recordUsage(id, customerId, orderId);
        return ResponseEntity.ok(new ApiResponse<>("Ghi nhận sử dụng khuyến mãi thành công!", true, null));
    }
    @PostMapping("/internal/validate")
    public ResponseEntity<ApiResponse<PromotionValidationResponse>> validatePromotionInternal(
            @Valid @RequestBody ValidatePromotionRequest request) {
        PromotionValidationResponse response = validationService.validateAndCalculate(request);
        return ResponseEntity.ok(new ApiResponse<>("Kiểm tra mã khuyến mãi thành công!", true, response));
    }

    @GetMapping("/{id}/usage-history")
    public ResponseEntity<ApiResponse<List<PromotionUsage>>> getPromotionUsageHistory(
            @PathVariable("id") Long id) {
        List<PromotionUsage> usages = promotionService.getPromotionUsageHistory(id);
        return ResponseEntity.ok(new ApiResponse<>("Lấy lịch sử sử dụng thành công!", true, usages));
    }

    @GetMapping("/customer/{customerId}/usage-history")
    public ResponseEntity<ApiResponse<List<PromotionUsage>>> getCustomerUsageHistory(
            @PathVariable("customerId") Long customerId) {
        List<PromotionUsage> usages = promotionService.getCustomerUsageHistory(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Lấy lịch sử sử dụng của khách hàng thành công!", true, usages));
    }
}