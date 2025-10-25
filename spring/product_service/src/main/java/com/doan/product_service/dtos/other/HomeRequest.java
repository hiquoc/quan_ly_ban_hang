package com.doan.product_service.dtos.other;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HomeRequest {
    private int newProduct;
    private int hotProduct;
    private int featuredProduct;
    private int discountProduct;
}
