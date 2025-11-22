package com.doan.delivery_service.dtos.shipper;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ShipperRequest {
    private String fullName;
    private String phone;
    private String email;
    private Long warehouseId;
}
