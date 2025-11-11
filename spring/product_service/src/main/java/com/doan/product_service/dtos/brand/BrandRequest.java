package com.doan.product_service.dtos.brand;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class BrandRequest {
    @NotBlank(message="Vui lòng điền tên thương hiệu!")
    private String name;
    @NotBlank(message="Vui lòng điền slug thương hiệu!")
    private String slug;
    private String description;
}