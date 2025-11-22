package com.doan.delivery_service.dtos.delivery;

import com.doan.delivery_service.enums.DeliveryStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChangeDeliveryOrderStatusRequest {
    @NotNull(message = "Mã đơn hàng không được để trống.")
    private Long deliveryId;

    @NotNull(message = "Trạng thái không được để trống.")
    private DeliveryStatus status;
    private String reason;
}