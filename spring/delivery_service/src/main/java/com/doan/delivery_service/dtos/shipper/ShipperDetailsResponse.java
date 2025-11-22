package com.doan.delivery_service.dtos.shipper;

import com.doan.delivery_service.models.DeliveryOrder;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class ShipperDetailsResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private OffsetDateTime createdAt;
    private String status;
    private List<DeliveryOrder> assignedOrders;
}