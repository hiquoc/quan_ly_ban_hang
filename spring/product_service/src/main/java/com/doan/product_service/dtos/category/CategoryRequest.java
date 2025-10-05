package com.doan.product_service.dtos.category;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class CategoryRequest {
    @NotBlank(message="Vui lòng điền tên doanh mục!")
    private String name;
    @NotBlank(message="Vui lòng slug doanh mục!")
    private String slug;

    private String imageUrl;

}