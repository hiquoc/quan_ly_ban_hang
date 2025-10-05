package com.doan.product_service.dtos.product_variant;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
@Data
@AllArgsConstructor
public class PublicVariantResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String name;
    private String sku;

    private BigDecimal sellingPrice;
    private Integer discountPercent;

    private Long soldCount;

    private Map<String, String> attributes;
    private Map<String, String> images;

}
