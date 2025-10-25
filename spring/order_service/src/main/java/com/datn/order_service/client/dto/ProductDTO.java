package com.datn.order_service.client.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private String shortDescription;
    private BigDecimal originalPrice;
    private BigDecimal sellingPrice;
    private BigDecimal discountPercentage;
    private String sku;
    private Integer stockQuantity;
    private String status; // ACTIVE, INACTIVE, OUT_OF_STOCK
    private Boolean isFeatured;
    private Boolean isNew;
    private Integer viewCount;
    private Integer soldCount;
    private Double averageRating;
    private Integer reviewCount;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String brandName;
    private List<String> images;
    private String thumbnail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}