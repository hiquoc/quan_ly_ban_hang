package com.doan.product_service.dtos.product;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProductRequest {
    @NotBlank(message="Vui lòng điền tên sản phẩm!")
    private String name;
    @NotBlank(message="Vui lòng điền slug sản phẩm!")
    private String slug;
    @NotBlank(message="Vui lòng mã sản phẩm!")
    private String productCode;
    private String description;
    private String shortDescription;
    @NotNull(message="Vui lòng điền doanh mục!")
    private Long categoryId;
    @NotNull(message="Vui lòng điền thương hiệu!")
    private Long brandId;
    private Map<String, String> technicalSpecs;
    private Long mainVariantId;
    private List<String> newDescriptionImageUrls;
    private List<String> deletedDescriptionImageUrls;
}