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
    private int hotProduct;
    private int featuredProduct;
    private int discountProduct;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof HomeRequest that)) return false;
        return newProduct == that.newProduct &&
                hotProduct == that.hotProduct &&
                featuredProduct == that.featuredProduct &&
                discountProduct == that.discountProduct;
    }

    @Override
    public int hashCode() {
        return Objects.hash(newProduct, hotProduct, featuredProduct, discountProduct);
    }
}