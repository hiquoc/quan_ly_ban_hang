package com.datn.promotion_service.dto.response;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PromotionDetailResponse extends PromotionResponse {
    private List<Long> applicableProducts;
    private List<Long> applicableCategories;
    private List<Long> applicableBrands;
    private Long createdByStaffId;
}