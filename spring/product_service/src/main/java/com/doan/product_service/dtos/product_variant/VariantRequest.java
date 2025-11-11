package com.doan.product_service.dtos.product_variant;

import jakarta.persistence.Column;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class VariantRequest {
    @NotNull(message="Vui lòng điền sản phẩm!")
    private Long productId;

    @NotBlank(message="Vui lòng điền tên biến thể!")
    private String name;

    @NotBlank(message="Vui lòng điền sku biến thể!")
    private String sku;

    private BigDecimal basePrice;
    private Integer discountPercent;
    private BigDecimal importPrice;
    private Map<String, String> attributes;

}