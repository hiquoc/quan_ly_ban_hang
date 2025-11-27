package com.datn.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemResponse implements Serializable {
    private Long id;
    private Long variantId;
    private String variantName;
    private String variantSku;
    private Long productId;
    private String productSlug;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private String imageUrl;
    private boolean returnRequested;
    private Map<Long,Integer> itemWarehouseData;
}