package com.datn.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePaymentRequest {

    @NotBlank(message = "Order number is required")
    private String orderNumber;

    @Positive(message = "Amount must be greater than 0")
    private BigDecimal amount;

    private String ipAddress;

    private String platform;
}