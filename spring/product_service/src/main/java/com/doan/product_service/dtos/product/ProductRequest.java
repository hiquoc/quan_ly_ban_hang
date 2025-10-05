package com.doan.product_service.dtos.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class ProductRequest {
    @NotBlank(message="Vui lòng điền tên sản phẩm!")
    private String name;
    @NotBlank(message="Vui lòng điền slug sản phẩm!")
    private String slug;
    @NotBlank(message="Vui lòng mã sản phẩm!")
    private String productCode;
    private String description;
    private String shortDescription;
    @NotBlank(message="Vui lòng điền doanh mục!")
    private Long categoryId;
    @NotBlank(message="Vui lòng điền thương hiệu!")
    private Long brandId;
    private Map<String, String> technicalSpecs;
    private String imageUrl;
}