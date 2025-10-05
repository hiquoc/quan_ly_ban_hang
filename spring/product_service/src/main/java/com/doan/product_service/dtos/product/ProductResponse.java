package com.doan.product_service.dtos.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.Map;

@Data
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String name;
    private String productCode;
    private String slug;
    private String description;
    private String shortDescription;
    private String categoryName;
    private String brandName;
    private Map<String, String> technicalSpecs;
    private String imageUrl;
    @JsonProperty("isActive")
    private boolean isActive;
    @JsonProperty("isFeatured")
    private boolean isFeatured;
    private OffsetDateTime createdAt;
}
