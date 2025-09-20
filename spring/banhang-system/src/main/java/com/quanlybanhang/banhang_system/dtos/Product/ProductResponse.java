package com.quanlybanhang.banhang_system.dtos.Product;

import java.util.List;

import com.quanlybanhang.banhang_system.models.ProductImage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String name;
    private List<ProductImage> images;
    private String category;
    private Double price;
    private Integer stock;
}
