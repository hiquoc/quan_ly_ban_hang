package com.datn.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentRequest {
    @NotBlank(message = "Mã đơn hàng không được để trống")
    private String orderNumber;

    @NotNull(message = "Số tiền không được để trống")
    private BigDecimal amount;

    private String ipAddress;

    private String orderInfo;
}
