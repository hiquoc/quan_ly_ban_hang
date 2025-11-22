package com.doan.delivery_service.dtos.inventory;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OrderItemTransactionRequest {
    @NotNull(message = "Vui lòng nhập mã biến thể!")
    private Long variantId;
    @Positive(message="Vui lòng nhập số lượng phù!")
    private int quantity;
    @Positive(message="Vui lòng nhập giá sản phẩm!")
    private BigDecimal pricePerItem;
}