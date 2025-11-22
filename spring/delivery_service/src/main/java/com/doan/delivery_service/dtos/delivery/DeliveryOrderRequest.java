package com.doan.delivery_service.dtos.delivery;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class DeliveryOrderRequest {
    private Long orderId;

    private String orderNumber;

    private String shippingName;

    private String shippingAddress;

    private String shippingPhone;

    private String paymentMethod;

    private Long warehouseId;

    private BigDecimal codAmount;

    private List<DeliveryOrderItemRequest> itemList;

}

