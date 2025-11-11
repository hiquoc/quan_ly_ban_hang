package com.doan.inventory_service.dtos.transaction;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTransactionStatusRequest {
    @NotBlank(message ="Vui lòng nhập tên trạng thái")
    String status;
    String note;
}
