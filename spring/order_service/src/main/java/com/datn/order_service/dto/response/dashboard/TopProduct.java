package com.datn.order_service.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TopProduct {
    private Long productId;
    private Long totalSold;
    private String productName;
    private String productCode;
    private String productSlug;
}