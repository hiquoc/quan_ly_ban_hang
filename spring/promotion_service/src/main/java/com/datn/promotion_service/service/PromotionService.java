package com.datn.promotion_service.service;

import com.datn.promotion_service.dto.request.CreatePromotionRequest;
import com.datn.promotion_service.dto.request.UpdatePromotionRequest;
import com.datn.promotion_service.dto.response.*;
import com.datn.promotion_service.entity.Promotion;
import com.datn.promotion_service.entity.PromotionUsage;
import com.datn.promotion_service.enums.PromotionType;
import com.datn.promotion_service.exception.PromotionNotFoundException;
import com.datn.promotion_service.repository.PromotionRepository;
import com.datn.promotion_service.repository.PromotionUsageRepository;
import com.datn.promotion_service.repository.feign.ProductClientRepository;
import com.datn.promotion_service.utils.WebhookUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository promotionUsageRepository;
    private final ProductClientRepository productClientRepository;
    @Autowired
    private WebhookUtils webhookUtils;

    // Tạo khuyến mãi mới
    @Transactional
    public PromotionResponse createPromotion(CreatePromotionRequest request) {
        log.info("Tạo khuyến mãi với mã: {}", request.getCode());

        if (promotionRepository.findByCode(request.getCode()).isPresent()) {
            throw new IllegalArgumentException("Mã khuyến mãi đã tồn tại: " + request.getCode());
        }

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }
        if (request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0 &&
                request.getPromotionType() == PromotionType.PERCENTAGE) {
            throw new IllegalArgumentException("Không thể giảm quá 100%!");
        }


        Promotion promotion = Promotion.builder()
                .code(request.getCode().toUpperCase())
                .name(request.getName())
                .description(request.getDescription())
                .promotionType(request.getPromotionType())
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount())
                .maxDiscountAmount(request.getMaxDiscountAmount())
                .usageLimit(request.getUsageLimit())
                .usageCount(0)
                .usageLimitPerCustomer(request.getUsageLimitPerCustomer())
                .startDate(request.getStartDate().withZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                        .toLocalDateTime())
                .endDate(request.getEndDate()
                        .withZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                        .toLocalDateTime())
                .applicableProducts(request.getApplicableProducts())
                .applicableCategories(request.getApplicableCategories())
                .applicableBrands(request.getApplicableBrands())
                .isActive(true)
                .createdByStaffId(request.getCreatedByStaffId())
                .build();

        promotion = promotionRepository.save(promotion);
        webhookUtils.postToWebhook(promotion.getId(), "insert");
        log.info("Khuyến mãi tạo thành công với ID: {}", promotion.getId());

        return mapToResponse(promotion);
    }

    // Cập nhật khuyến mãi
    @Transactional
    public PromotionResponse updatePromotion(Long id, UpdatePromotionRequest request) {
        log.info("Cập nhật khuyến mãi ID: {}", id);
        System.out.println(request);
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy khuyến mãi với ID: " + id));

        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }
        if (request.getDiscountValue() != null && request.getPromotionType() != null &&
                request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0 &&
                request.getPromotionType() == PromotionType.PERCENTAGE) {
            throw new IllegalArgumentException("Không thể giảm quá 100%!");
        }

        if (request.getName() != null) promotion.setName(request.getName());
        if (request.getDescription() != null) promotion.setDescription(request.getDescription());
        if (request.getDiscountValue() != null) promotion.setDiscountValue(request.getDiscountValue());
        if (request.getMinOrderAmount() != null) promotion.setMinOrderAmount(request.getMinOrderAmount());
        if (request.getMaxDiscountAmount() != null) promotion.setMaxDiscountAmount(request.getMaxDiscountAmount());
        if (request.getUsageLimit() != null) promotion.setUsageLimit(request.getUsageLimit());
        if (request.getUsageLimitPerCustomer() != null)
            promotion.setUsageLimitPerCustomer(request.getUsageLimitPerCustomer());
        if (request.getStartDate() != null) {
            promotion.setStartDate(request.getStartDate()
                    .withZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDateTime());
        }
        if (request.getEndDate() != null) {
            promotion.setEndDate(request.getEndDate()
                    .withZoneSameInstant(ZoneId.of("Asia/Ho_Chi_Minh"))
                    .toLocalDateTime());
        }
        promotion.setApplicableProducts(request.getApplicableProducts());
        promotion.setApplicableCategories(request.getApplicableCategories());
        promotion.setApplicableBrands(request.getApplicableBrands());

        promotion = promotionRepository.save(promotion);
        webhookUtils.postToWebhook(id, "update");
        log.info("Khuyến mãi cập nhật thành công: {}", id);

        return mapToResponse(promotion);
    }

    public PromotionResponse updatePromotionActive(Long id) {
        log.info("Cập nhật khuyến mãi ID: {}", id);

        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy khuyến mãi với ID: " + id));

        promotion.setIsActive(!promotion.getIsActive());
        webhookUtils.postToWebhook(promotion.getId(), "update");
        return mapToResponse(promotionRepository.save(promotion));
    }

    // Lấy khuyến mãi theo ID
    public PromotionDetailResponse getPromotionById(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy khuyến mãi với ID: " + id));

        return mapToDetailResponse(promotion);
    }

    // Lấy khuyến mãi theo mã
    public PromotionDetailResponse getPromotionByCode(String code) {
        Promotion promotion = promotionRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy khuyến mãi với mã: " + code));

        return mapToDetailResponse(promotion);
    }

    // Lấy tất cả khuyến mãi có phân trang
    public Page<PromotionResponse> getAllPromotions(String keyword, Boolean isActive, Pageable pageable) {
        Specification<Promotion> spec = Specification.where(null);

        if (keyword != null && !keyword.trim().isEmpty()) {
            spec = spec.and((root, query, cb) ->
                    cb.or(
                            cb.like(cb.lower(root.get("name")), "%" + keyword.toLowerCase() + "%"),
                            cb.like(cb.lower(root.get("code")), "%" + keyword.toLowerCase() + "%")
                    )
            );
        }

        if (isActive != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), isActive));
        }

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "id"));
        return promotionRepository.findAll(spec, sortedPageable)
                .map(this::mapToResponse);

    }


    // Lấy khuyến mãi đang hoạt động
    public List<PromotionResponse> getActivePromotions() {
        List<Promotion> promotions = promotionRepository.findActivePromotions(LocalDateTime.now());
        return promotions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Lấy khuyến mãi sắp diễn ra
    public List<PromotionResponse> getUpcomingPromotions() {
        List<Promotion> promotions = promotionRepository.findUpcomingPromotions(LocalDateTime.now());
        return promotions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Xóa khuyến mãi
    @Transactional
    public void deletePromotion(Long id) {
        log.info("Xóa khuyến mãi ID: {}", id);

        if (!promotionRepository.existsById(id)) {
            throw new PromotionNotFoundException("Không tìm thấy khuyến mãi với ID: " + id);
        }

        if(!promotionUsageRepository.existsByPromotionId(id)){
            throw new PromotionNotFoundException("Không thể xóa mã khuyến mãi này!");
        }

        promotionRepository.deleteById(id);
       webhookUtils.postToWebhook(id, "delete");
        log.info("Khuyến mãi xóa thành công: {}", id);
    }

    // Bật/Tắt khuyến mãi
    @Transactional
    public PromotionResponse togglePromotionStatus(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy khuyến mãi với ID: " + id));

        promotion.setIsActive(!promotion.getIsActive());
        promotion = promotionRepository.save(promotion);

        log.info("Trạng thái khuyến mãi {} đổi thành: {}", id, promotion.getIsActive() ? "HOẠT ĐỘNG" : "KHÔNG HOẠT ĐỘNG");
        webhookUtils.postToWebhook(id, "update");
        return mapToResponse(promotion);
    }

    // Ghi nhận việc sử dụng khuyến mãi
    @Transactional
    public void recordUsage(Long promotionId, Long customerId, Long orderId) {
        log.info("Ghi nhận sử dụng khuyến mãi - PromotionId: {}, CustomerId: {}, OrderId: {}", promotionId, customerId, orderId);

        if (promotionUsageRepository.existsByPromotionIdAndOrderId(promotionId, orderId)) {
            log.warn("Khuyến mãi đã áp dụng cho đơn hàng: {}", orderId);
            return;
        }

        PromotionUsage usage = PromotionUsage.builder()
                .promotionId(promotionId)
                .customerId(customerId)
                .orderId(orderId)
                .build();

        promotionUsageRepository.save(usage);

        Promotion promotion = promotionRepository.findById(promotionId)
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy khuyến mãi"));

        promotion.setUsageCount(promotion.getUsageCount() + 1);
        if (promotion.getUsageLimit() != null && promotion.getUsageCount() >= promotion.getUsageLimit())
            promotion.setIsActive(false);
        promotionRepository.save(promotion);
        webhookUtils.postToWebhook(promotionId, "update");
        log.info("Ghi nhận sử dụng khuyến mãi thành công");
    }

    // Lấy lịch sử sử dụng khuyến mãi
    public List<PromotionUsage> getPromotionUsageHistory(Long promotionId) {
        return promotionUsageRepository.findByPromotionId(promotionId);
    }

    // Lấy lịch sử sử dụng khuyến mãi của khách hàng
    public List<PromotionUsage> getCustomerUsageHistory(Long customerId) {
        return promotionUsageRepository.findByCustomerId(customerId);
    }

    // Chuyển đổi entity Promotion sang PromotionResponse
    private PromotionResponse mapToResponse(Promotion promotion) {
        return PromotionResponse.builder()
                .id(promotion.getId())
                .code(promotion.getCode())
                .name(promotion.getName())
                .description(promotion.getDescription())
                .promotionType(promotion.getPromotionType())
                .discountValue(promotion.getDiscountValue())
                .minOrderAmount(promotion.getMinOrderAmount())
                .maxDiscountAmount(promotion.getMaxDiscountAmount())
                .usageLimit(promotion.getUsageLimit())
                .usageCount(promotion.getUsageCount())
                .usageLimitPerCustomer(promotion.getUsageLimitPerCustomer())
                .startDate(promotion.getStartDate())
                .endDate(promotion.getEndDate())
                .isActive(promotion.getIsActive())
                .isValid(promotion.isValid())
                .createdAt(promotion.getCreatedAt())
                .updatedAt(promotion.getUpdatedAt())
                .build();
    }

    // Chuyển đổi entity Promotion sang PromotionDetailResponse
    private PromotionDetailResponse mapToDetailResponse(Promotion promotion) {
        PromotionDetailResponse response = new PromotionDetailResponse();

        // Set các field từ Promotion (cha)
        response.setId(promotion.getId());
        response.setCode(promotion.getCode());
        response.setName(promotion.getName());
        response.setDescription(promotion.getDescription());
        response.setPromotionType(promotion.getPromotionType());
        response.setDiscountValue(promotion.getDiscountValue());
        response.setMinOrderAmount(promotion.getMinOrderAmount());
        response.setMaxDiscountAmount(promotion.getMaxDiscountAmount());
        response.setUsageLimit(promotion.getUsageLimit());
        response.setUsageCount(promotion.getUsageCount());
        response.setUsageLimitPerCustomer(promotion.getUsageLimitPerCustomer());
        response.setStartDate(promotion.getStartDate());
        response.setEndDate(promotion.getEndDate());
        response.setIsActive(promotion.getIsActive());
        response.setIsValid(promotion.isValid());
        response.setCreatedAt(promotion.getCreatedAt());
        response.setUpdatedAt(promotion.getUpdatedAt());

        // Set các field riêng của PromotionDetailResponse (con)
        try {
            List<ProductResponse> productData = null;
            if (promotion.getApplicableProducts() != null && !promotion.getApplicableProducts().isEmpty()) {
                List<Long> productIds = promotion.getApplicableProducts();
                productData = productClientRepository.getProductsByIds(productIds);
            }
            response.setApplicableProducts(productData);
            List<BrandResponse> brandData = null;
            if (promotion.getApplicableBrands() != null && !promotion.getApplicableBrands().isEmpty()) {
                List<Long> brandIds = promotion.getApplicableBrands();
                brandData = productClientRepository.getBrandsByIds(brandIds);
            }
            response.setApplicableBrands(brandData);
            List<CategoryResponse> categoryData = null;
            if (promotion.getApplicableCategories() != null && !promotion.getApplicableCategories().isEmpty()) {
                List<Long> categoryIds = promotion.getApplicableCategories();
                categoryData = productClientRepository.getCategoriesByIds(categoryIds);
            }
            response.setApplicableCategories(categoryData);
            response.setCreatedByStaffId(promotion.getCreatedByStaffId());
        } catch (Exception e) {
            throw new RuntimeException(e);
        }


        return response;
    }


}