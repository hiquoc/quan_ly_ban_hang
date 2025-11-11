package com.datn.order_service.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
public class RecentOrderInfo {
    private String orderNumber;
    private Long customerId;
    private Double totalAmount;
    private Double fee;
    private Double discountAmount;
    private Double revenue;
    private String status;
    private OffsetDateTime createdAt;
}
