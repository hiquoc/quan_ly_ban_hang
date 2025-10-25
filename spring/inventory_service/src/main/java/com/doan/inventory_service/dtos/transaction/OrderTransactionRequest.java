package com.doan.inventory_service.dtos.transaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class OrderTransactionRequest {
    @NotBlank(message = "Vui lòng nhập mã đơn hàng!")
    private String orderNumber;
    private List<OrderItemTransactionRequest> orderItems;
    @NotNull(message = "Vui lòng nhập mã nhân viên!")
    private Long staffId;
    private String note;
}
