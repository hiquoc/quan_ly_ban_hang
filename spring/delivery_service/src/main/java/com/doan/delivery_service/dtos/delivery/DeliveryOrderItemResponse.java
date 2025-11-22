package com.doan.delivery_service.dtos.delivery;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeliveryOrderItemResponse {
    private Long id;
    private Long orderItemId;
    private Long variantId;
    private String variantName;
    private String sku;
    private BigDecimal unitPrice;
    private String imageUrl;
    private int quantity;
}


