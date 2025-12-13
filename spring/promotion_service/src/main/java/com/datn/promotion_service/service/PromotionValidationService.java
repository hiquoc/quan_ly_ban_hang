package com.datn.promotion_service.service;

import com.datn.promotion_service.dto.request.ValidatePromotionRequest;
import com.datn.promotion_service.dto.response.CategoryBrandIdsResponse;
import com.datn.promotion_service.dto.response.ProductResponse;
import com.datn.promotion_service.dto.response.PromotionResponse;
import com.datn.promotion_service.dto.response.PromotionValidationResponse;
import com.datn.promotion_service.entity.Promotion;
import com.datn.promotion_service.exception.PromotionExpiredException;
import com.datn.promotion_service.exception.PromotionNotFoundException;
import com.datn.promotion_service.exception.PromotionUsageLimitException;
import com.datn.promotion_service.repository.PromotionRepository;
import com.datn.promotion_service.repository.PromotionUsageRepository;
import com.datn.promotion_service.repository.feign.ProductClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PromotionValidationService {

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository promotionUsageRepository;
    private final ProductClientRepository productClientRepository;

    // Kiểm tra và tính toán giảm giá
    public PromotionValidationResponse validateAndCalculate(ValidatePromotionRequest request) {
        log.info("Kiểm tra mã khuyến mãi: {} cho khách hàng: {}", request.getCode(), request.getCustomerId());

        // Tìm khuyến mãi
        Promotion promotion = promotionRepository.findByCode(request.getCode().toUpperCase())
                .orElseThrow(() -> new PromotionNotFoundException("Không tìm thấy mã khuyến mãi: " + request.getCode()));

        // Kiểm tra hợp lệ
        String validationMessage = validatePromotion(promotion, request);

        if (validationMessage != null) {
            return PromotionValidationResponse.builder()
                    .isValid(false)
                    .message(validationMessage)
                    .discountAmount(BigDecimal.ZERO)
                    .finalAmount(request.getOrderAmount())
                    .promotion(mapToResponse(promotion))
                    .build();
        }

        // Tính toán giảm giá
        BigDecimal discountAmount = calculateDiscount(promotion, request);
        BigDecimal finalAmount = request.getOrderAmount().subtract(discountAmount);

        log.info("Khuyến mãi hợp lệ - Giảm: {}, Tổng cuối: {}", discountAmount, finalAmount);

        return PromotionValidationResponse.builder()
                .isValid(true)
                .message("Áp dụng khuyến mãi thành công")
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .promotion(mapToResponse(promotion))
                .build();
    }

    // Kiểm tra các quy tắc khuyến mãi
    private String validatePromotion(Promotion promotion, ValidatePromotionRequest request) {
        // Kiểm tra đang hoạt động
        if (!promotion.getIsActive()) return "Khuyến mãi chưa được kích hoạt";

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(promotion.getStartDate())) return "Khuyến mãi chưa bắt đầu. Bắt đầu từ: " + promotion.getStartDate();
        if (now.isAfter(promotion.getEndDate())) throw new PromotionExpiredException("Khuyến mãi đã hết hạn: " + promotion.getEndDate());

        // Kiểm tra giới hạn sử dụng toàn cầu
        if (promotion.hasUsageLimit() && promotion.isUsageLimitReached()) throw new PromotionUsageLimitException("Khuyến mãi đã đạt giới hạn sử dụng");

        // Kiểm tra giới hạn sử dụng của khách hàng
        if (promotion.getUsageLimitPerCustomer() != null && promotion.getUsageLimitPerCustomer() > 0) {
            Integer customerUsageCount = promotionUsageRepository.countByPromotionIdAndCustomerId(promotion.getId(), request.getCustomerId());
            if (customerUsageCount >= promotion.getUsageLimitPerCustomer()) return "Bạn đã đạt giới hạn sử dụng khuyến mãi này";
        }
        System.out.println(request);

        // Kiểm tra số tiền tối thiểu
        if (promotion.getMinOrderAmount() != null &&
                request.getOrderAmount().compareTo(promotion.getMinOrderAmount()) < 0) {

            Locale vietnam = new Locale("vi", "VN");
            NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(vietnam);

            String minAmountFormatted = currencyFormatter.format(promotion.getMinOrderAmount());
            String orderAmountFormatted = currencyFormatter.format(request.getOrderAmount());

            return String.format("Số tiền tối thiểu để áp dụng là %s.\n Hiện tại: %s",
                    minAmountFormatted, orderAmountFormatted);
        }

        // Kiểm tra sản phẩm áp dụng
        if (promotion.getApplicableProducts() != null && !promotion.getApplicableProducts().isEmpty()) {
            if (request.getProductIds() == null || request.getProductIds().isEmpty())
                return "Khuyến mãi yêu cầu sản phẩm cụ thể";

            boolean hasApplicableProduct = request.getProductIds().stream()
                    .anyMatch(promotion.getApplicableProducts()::contains);

            if (!hasApplicableProduct)
                return "Khuyến mãi không áp dụng cho sản phẩm trong giỏ hàng";
        }

        List<Long> applicableCategories =
                Optional.ofNullable(promotion.getApplicableCategories()).orElse(List.of());

        List<Long> applicableBrands =
                Optional.ofNullable(promotion.getApplicableBrands()).orElse(List.of());

        if (!applicableCategories.isEmpty() || !applicableBrands.isEmpty()) {

            CategoryBrandIdsResponse response =
                    productClientRepository.getCategoryIdsAndBrandIdsByProductsId(
                            request.getProductIds()
                    );

            List<Long> cartCategoryIds =
                    Optional.ofNullable(response.getCategoryIds()).orElse(List.of());

            List<Long> cartBrandIds =
                    Optional.ofNullable(response.getBrandIds()).orElse(List.of());

            if (!applicableCategories.isEmpty()) {

                boolean hasCategoryMatch = cartCategoryIds.stream()
                        .anyMatch(applicableCategories::contains);

                if (!hasCategoryMatch) {
                    return "Khuyến mãi không áp dụng cho danh mục trong giỏ hàng";
                }
            }

            if (!applicableBrands.isEmpty()) {

                boolean hasBrandMatch = cartBrandIds.stream()
                        .anyMatch(applicableBrands::contains);

                if (!hasBrandMatch) {
                    return "Khuyến mãi không áp dụng cho thương hiệu trong giỏ hàng";
                }
            }
        }



        return null; // Hợp lệ
    }

    // Tính toán số tiền giảm
    private BigDecimal calculateDiscount(Promotion promotion, ValidatePromotionRequest request) {
        BigDecimal discountAmount = BigDecimal.ZERO;

        switch (promotion.getPromotionType()) {
            case PERCENTAGE:
                discountAmount = calculatePercentageDiscount(promotion, request.getOrderAmount());
                break;
            case FIXED_AMOUNT:
                discountAmount = promotion.getDiscountValue();
                break;
        }

        if (promotion.getMaxDiscountAmount() != null && discountAmount.compareTo(promotion.getMaxDiscountAmount()) > 0)
            discountAmount = promotion.getMaxDiscountAmount();

        if (discountAmount.compareTo(request.getOrderAmount()) > 0) discountAmount = request.getOrderAmount();

        return discountAmount.setScale(2, RoundingMode.HALF_UP);
    }

    // Tính phần trăm giảm
    private BigDecimal calculatePercentageDiscount(Promotion promotion, BigDecimal orderAmount) {
        if (promotion.getDiscountValue() == null) return BigDecimal.ZERO;

        BigDecimal percentage = promotion.getDiscountValue().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return orderAmount.multiply(percentage).setScale(2, RoundingMode.HALF_UP);
    }

    // Kiểm tra nhanh mã khuyến mãi còn hợp lệ
    public boolean isPromotionCodeValid(String code) {
        return promotionRepository.findByCode(code.toUpperCase())
                .map(Promotion::canBeUsed)
                .orElse(false);
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
}