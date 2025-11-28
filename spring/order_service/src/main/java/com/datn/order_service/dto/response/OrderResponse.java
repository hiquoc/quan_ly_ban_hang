package com.datn.order_service.dto.response;

import com.datn.order_service.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
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
    private String paymentMethod;
    private PaymentStatus paymentStatus;
    private OffsetDateTime orderDate;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deliveredDate;
    private List<Long> warehouseData;
}