package com.datn.order_service.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrderStats {
    private long currentOrders;
    private double currentRevenue;
    private long previousOrders;
    private double previousRevenue;
}
