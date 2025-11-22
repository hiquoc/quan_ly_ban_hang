package com.doan.delivery_service.dtos.inventory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderTransactionRequest {
    @NotBlank(message = "Vui lòng nhập mã đơn hàng!")
    private String orderNumber;
    private List<OrderItemTransactionRequest> orderItems;
    @NotNull(message = "Vui lòng nhập mã nhân viên!")
    private Long shipperId;
    private String note;
}