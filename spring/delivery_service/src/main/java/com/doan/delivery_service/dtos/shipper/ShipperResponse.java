package com.doan.delivery_service.dtos.shipper;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
public class ShipperResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private OffsetDateTime createdAt;
}