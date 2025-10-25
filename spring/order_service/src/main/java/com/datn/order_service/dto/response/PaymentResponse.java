package com.datn.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private String orderNumber;
    private String paymentUrl;
    private String message;
    private String paymentMethod; // VNPAY, COD, etc.
}