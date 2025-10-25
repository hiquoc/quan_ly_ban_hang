package com.doan.inventory_service.dtos.purchase;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItemRequest {
    @NotNull(message = "Vui lòng điền biến thể!")
    private Long variantId;

    @Positive(message = "Số lượng phải lớn hơn 0!")
    private int quantity;

    @Positive(message = "Giá nhập phải lớn hơn 0!")
    private BigDecimal importPrice;
}
