package com.doan.delivery_service.dtos.delivery;

import com.doan.delivery_service.enums.DeliveryStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeliveryOrderResponse {
    private Long id;
    private String deliveryNumber;
    private Long orderId;
    private String orderNumber;
    private String shippingName;
    private String shippingAddress;
    private String shippingPhone;
    private String paymentMethod;
    private Long warehouseId;
    private DeliveryStatus status;
    private Long assignedShipperId;
    private OffsetDateTime assignedAt;
    private OffsetDateTime deliveredAt;
    private String failedReason;
    private BigDecimal codAmount;

    private List<DeliveryOrderItemResponse> itemList;

    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;
}

