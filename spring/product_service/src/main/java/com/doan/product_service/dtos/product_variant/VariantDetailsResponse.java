package com.doan.product_service.dtos.product_variant;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
public class VariantDetailsResponse {
    private Long id;
    private Long productId;
    private String name;
    private String sku;
    private BigDecimal basePrice;
    private BigDecimal sellingPrice;
    private Integer discountPercent;

    private Map<String, String> attributes;
    private Map<String, String> imageUrls;

    private Long soldCount;
    private String status;
}
