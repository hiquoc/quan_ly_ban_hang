package com.datn.order_service.dto.response;

import com.datn.order_service.enums.PaymentStatus;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetailResponse implements Serializable {
    // Base fields
    private Long id;
    private String orderNumber;
    private Long customerId;
    private String customerName;
    private BigDecimal subtotal;
    private BigDecimal fee;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private BigDecimal revenue;
    private String statusName;
    private PaymentStatus paymentStatus;
    private OffsetDateTime orderDate;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime cancelledDate;

    // Detail fields
    private List<OrderItemResponse> items;
    private String shippingName;
    private String shippingAddress;
    private String shippingPhone;
    private String paymentMethod; // COD or VNPAY
    private String promotionCode;
    private OffsetDateTime shippedDate;
    private OffsetDateTime deliveredDate;
    private String notes;
}