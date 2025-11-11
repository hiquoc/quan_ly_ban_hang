package com.datn.promotion_service.dto.request;

import com.datn.promotion_service.enums.PromotionType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePromotionRequest {

    private String name;
    private String description;
    private PromotionType promotionType;
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private BigDecimal maxDiscountAmount;
    private Integer usageLimit;
    private Integer usageLimitPerCustomer;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime startDate;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime endDate;
    private List<Long> applicableProducts;
    private List<Long> applicableCategories;
    private List<Long> applicableBrands;
}