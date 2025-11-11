package com.doan.product_service.dtos.product_variant;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VariantDetailsResponse implements Serializable {
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
