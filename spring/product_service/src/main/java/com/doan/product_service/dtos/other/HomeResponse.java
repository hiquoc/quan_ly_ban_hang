package com.doan.product_service.dtos.other;

import com.doan.product_service.dtos.product.ProductResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@NoArgsConstructor
@Data
@AllArgsConstructor
public class HomeResponse implements Serializable {
    private List<ProductResponse> newProducts;
    private List<ProductResponse> hotProducts;
    private List<ProductResponse> featuredProducts;
    private List<ProductResponse> discountProducts;
}
