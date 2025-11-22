package com.datn.order_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class DeliveryOrderItemRequest {

    @NotNull(message = "orderItemId không được để trống.")
    private Long orderItemId;

    @NotNull(message = "variantId không được để trống.")
    private Long variantId;

    @NotBlank(message = "Tên biến thể không được để trống.")
    private String variantName;

    @NotBlank(message = "SKU không được để trống.")
    private String sku;

    @NotNull(message = "Giá sản phẩm không được để trống.")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá phải lớn hơn 0.")
    private BigDecimal unitPrice;

    @NotBlank(message = "Hình ảnh sản phẩm không được để trống.")
    private String imageUrl;

    @Min(value = 1, message = "Số lượng phải lớn hơn hoặc bằng 1.")
    private int quantity;
}