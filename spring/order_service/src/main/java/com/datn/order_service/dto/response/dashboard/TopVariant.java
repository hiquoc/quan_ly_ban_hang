package com.datn.order_service.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TopVariant {
    private Long variantId;
    private Long totalSold;
    private String variantName;
    private String variantSku;
}