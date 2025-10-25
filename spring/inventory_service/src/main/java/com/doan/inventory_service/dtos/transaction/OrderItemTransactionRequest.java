package com.doan.inventory_service.dtos.transaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class OrderItemTransactionRequest {
    @NotNull(message = "Vui lòng nhập mã biến thể!")
    private Long variantId;
    @Positive(message="Vui lòng nhập số lượng phù!")
    private int quantity;
    @Positive(message="Vui lòng nhập giá sản phẩm!")
    private BigDecimal pricePerItem;
}
