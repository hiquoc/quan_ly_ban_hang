package com.doan.delivery_service.dtos.order;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOrderStatusRequest {
    @NotEmpty(message = "Order number list cannot be empty.")
    private List<String> orderNumbers;
    @NotNull(message = "Shipper Id is required")
    private Long staffId;
    @NotNull(message = "Status Id is required")
    private Long statusId;
    private String notes;
}