package com.datn.promotion_service.dto.response;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PromotionDetailResponse extends PromotionResponse {
    private List<ProductResponse> applicableProducts;
    private List<CategoryResponse> applicableCategories;
    private List<BrandResponse> applicableBrands;
    private Long createdByStaffId;
}