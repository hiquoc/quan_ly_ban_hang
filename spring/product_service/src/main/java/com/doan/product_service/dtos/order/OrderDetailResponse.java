package com.doan.product_service.dtos.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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