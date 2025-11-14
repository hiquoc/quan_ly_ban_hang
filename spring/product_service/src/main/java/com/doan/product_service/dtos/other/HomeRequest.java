// src/main/java/com/doan/product_service/dtos/other/HomeRequest.java
package com.doan.product_service.dtos.other;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HomeRequest implements Serializable {
    private int newProduct;
//    private int hotProduct;
//    private int featuredProduct;
    private int discountProduct;
}