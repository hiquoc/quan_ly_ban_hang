package com.datn.order_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReturnOrderItemRequest {

    @NotNull(message = "variantId không được để trống")
    private Long variantId;

    @NotNull(message = "Số lượng trả không được để trống")
    @Min(value = 1, message = "Số lượng trả phải lớn hơn 0")
    private Integer quantity;
}
