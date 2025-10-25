package com.doan.inventory_service.dtos.order;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrderStatusFromInvRequest {
    @NotNull(message = "Staff Id is required")
    private Long staffId;
    @NotNull(message = "Status Id is required")
    private Long statusId;
    private String notes;
}