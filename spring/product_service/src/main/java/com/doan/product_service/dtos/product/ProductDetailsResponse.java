package com.doan.product_service.dtos.product;

import com.doan.product_service.dtos.product_variant.VariantDetailsResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class ProductDetailsResponse {
    private Long id;
    private String name;
    private String productCode;
    private String slug;
    private String description;
    private String shortDescription;
    private String categoryName;
    private String categorySlug;
    private String brandName;
    private String brandSlug;
    private Map<String, String> technicalSpecs;
    @JsonProperty("isFeatured")
    private boolean isFeatured;
    private Long mainVariantId;
    private List<VariantDetailsResponse> variants;
}
