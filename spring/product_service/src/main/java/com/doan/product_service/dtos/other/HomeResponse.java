package com.doan.product_service.dtos.other;

import com.doan.product_service.dtos.product.ProductResponse;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class HomeResponse {
    private List<ProductResponse> newProducts;
    private List<ProductResponse> hotProducts;
    private List<ProductResponse> featuredProducts;
    private List<ProductResponse> discountProducts;
}
