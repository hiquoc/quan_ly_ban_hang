package com.datn.order_service.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CancelDeliveryOrderRequest {
    @NotNull(message = "Mã đơn hàng không được để trống.")
    private Long orderId;
    @NotNull(message = "Mã nhân viên không được để trống.")
    private Long staffId;
//    @NotNull(message = "Trạng thái không được để trống.")
//    private DeliveryStatus status;
    private String reason;
}