package com.doan.delivery_service.dtos.delivery;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class DeliveryOrderItemRequest {
    private Long orderItemId;
    private Long variantId;

    private String variantName;
    private String sku;

    private BigDecimal unitPrice;

    private String imageUrl;
    private int quantity;
}
