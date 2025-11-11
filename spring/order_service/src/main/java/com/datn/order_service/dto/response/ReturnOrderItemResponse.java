package com.datn.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@Builder
public class ReturnOrderItemResponse {
    private Long id;
    private Long returnOrderId;
    private Long variantId;
    private String variantName;
    private String variantSku;
    private Long productId;
    private String productSlug;
    private String imageUrl;
    private Integer quantity;
    private BigDecimal unitPrice;
}
