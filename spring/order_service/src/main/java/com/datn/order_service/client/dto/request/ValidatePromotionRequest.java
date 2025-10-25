package com.datn.order_service.client.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidatePromotionRequest {

    @NotBlank(message = "Promotion code is required")
    private String code;

    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @NotNull(message = "Order amount is required")
    @DecimalMin(value = "0.0", message = "Order amount must be positive")
    private BigDecimal orderAmount;

    private List<Long> productIds;
    private List<Long> categoryIds;
    private List<Long> brandIds;
}