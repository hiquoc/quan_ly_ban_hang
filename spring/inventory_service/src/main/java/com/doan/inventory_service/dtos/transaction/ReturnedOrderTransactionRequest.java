package com.doan.inventory_service.dtos.transaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ReturnedOrderTransactionRequest {
    @NotBlank(message = "Vui lòng nhập mã đơn hàng!")
    private String orderNumber;
    @NotNull(message = "Vui lòng nhập mã nhân viên!")
    private Long shipperId;
    @NotNull(message = "Vui lòng nhập trạng thái!")
    private String status;
    private String note;

    @NotNull(message = "Vui lòng nhập mã kho!")
    private Long warehouseId;
}
