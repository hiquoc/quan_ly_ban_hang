package com.doan.product_service.dtos.product_variant;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;
import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
public class VariantResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String name;
    private String sku;

    private BigDecimal importPrice;
    private BigDecimal sellingPrice;
    private Integer discountPercent;

    private Map<String, String> attributes;
    private Map<String, String> imageUrls;

    private Long soldCount;

    @JsonProperty("isActive")
    private boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
