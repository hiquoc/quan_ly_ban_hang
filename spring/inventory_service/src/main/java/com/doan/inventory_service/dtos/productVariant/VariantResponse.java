package com.doan.inventory_service.dtos.productVariant;

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
    private boolean isActive;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}