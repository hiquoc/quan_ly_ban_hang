package com.datn.order_service.client.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantDTO {
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