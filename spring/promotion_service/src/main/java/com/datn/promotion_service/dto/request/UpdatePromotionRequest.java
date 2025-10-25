package com.datn.promotion_service.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePromotionRequest {

    private String name;
    private String description;
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private BigDecimal maxDiscountAmount;
    private Integer usageLimit;
    private Integer usageLimitPerCustomer;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<Long> applicableProducts;
    private List<Long> applicableCategories;
    private List<Long> applicableBrands;
    private Boolean isActive;
}