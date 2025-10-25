package com.datn.promotion_service.dto.request;

import com.datn.promotion_service.enums.DiscountType;
import com.datn.promotion_service.enums.PromotionType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePromotionRequest {

    @NotBlank(message = "Code is required")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Code must contain only uppercase letters, numbers, underscores and hyphens")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    private String description;

    @NotNull(message = "Promotion type is required")
    private PromotionType promotionType;

    private DiscountType discountType;

    @DecimalMin(value = "0.0", message = "Discount value must be positive")
    private BigDecimal discountValue;

    @DecimalMin(value = "0.0", message = "Min order amount must be positive")
    private BigDecimal minOrderAmount;

    private BigDecimal maxDiscountAmount;

    @Min(value = 1, message = "Usage limit must be at least 1")
    private Integer usageLimit;

    @Min(value = 1, message = "Usage limit per customer must be at least 1")
    private Integer usageLimitPerCustomer;

    @NotNull(message = "Start date is required")
    private LocalDateTime startDate;

    @NotNull(message = "End date is required")
    private LocalDateTime endDate;

    private List<Long> applicableProducts;
    private List<Long> applicableCategories;
    private List<Long> applicableBrands;

    @NotNull(message = "Staff ID is required")
    private Long createdByStaffId;
}