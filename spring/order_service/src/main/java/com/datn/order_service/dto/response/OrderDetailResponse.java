package com.datn.order_service.dto.response;

import com.datn.order_service.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetailResponse {
    // Base fields
    private Long id;
    private String orderNumber;
    private Long customerId;
    private String customerName;
    private BigDecimal subtotal;
    private BigDecimal fee;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String statusName;
    private PaymentStatus paymentStatus;
    private LocalDateTime orderDate;
    private LocalDateTime createdAt;
    private LocalDateTime cancelledDate;

    // Detail fields
    private List<OrderItemResponse> items;
    private String shippingName;
    private String shippingAddress;
    private String shippingPhone;
    private String paymentMethod; // COD or VNPAY
    private String promotionCode;
    private LocalDateTime shippedDate;
    private LocalDateTime deliveredDate;
    private String notes;
}