package com.doan.product_service.dtos.product_variant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;
import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@Builder
public class VariantResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productCode;
    private String productSlug;
    private String name;
    private String sku;

    private BigDecimal importPrice;
    private BigDecimal basePrice;
    private BigDecimal sellingPrice;
    private Integer discountPercent;

    private Map<String, String> attributes;
    private Map<String, String> imageUrls;

    private Long soldCount;
    private boolean isActive;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
