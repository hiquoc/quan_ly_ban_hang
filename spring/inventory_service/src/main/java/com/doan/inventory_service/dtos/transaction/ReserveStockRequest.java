package com.doan.inventory_service.dtos.transaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReserveStockRequest {
    @NotNull(message = "Vui lòng nhập mã biến thể!")
    private Long variantId;
    @Positive(message="Vui lòng nhập số lượng phù hợp!")
    private int quantity;
    @NotBlank(message = "Vui lòng nhập mã đơn hàng!")
    private String orderNumber;
}
