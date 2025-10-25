package com.datn.order_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BuyNowRequest {
    @NotNull
    private Long customerId;

    @NotNull
    private Long variantId;

    @NotNull
    @Min(1)
    private Integer quantity;

    @NotBlank
    private String shippingName;

    @NotBlank
    private String shippingAddress;

    @NotBlank
    private String shippingPhone;

    @NotBlank
    private String paymentMethod;

    private String promotionCode;
    private String notes;
}