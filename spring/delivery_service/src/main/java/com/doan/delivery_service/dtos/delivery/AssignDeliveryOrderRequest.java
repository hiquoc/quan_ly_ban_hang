package com.doan.delivery_service.dtos.delivery;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AssignDeliveryOrderRequest {
    @NotEmpty(message = "Danh sách đơn hàng không được để trống.")
    private List<Long> deliveryIds;

    @NotNull(message = "ShipperId không được để trống.")
    private Long shipperId;
}