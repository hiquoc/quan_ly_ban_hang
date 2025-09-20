package com.quanlybanhang.banhang_system.dtos.Product;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    private  String name;
    private String category;
    private Double price;
    private  Integer stock;
}
