package com.datn.promotion_service.dto.response;

import com.datn.promotion_service.enums.PromotionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromotionResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private PromotionType promotionType;
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private BigDecimal maxDiscountAmount;
    private Integer usageLimit;
    private Integer usageCount;
    private Integer usageLimitPerCustomer;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean isActive;
    private Boolean isValid;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}