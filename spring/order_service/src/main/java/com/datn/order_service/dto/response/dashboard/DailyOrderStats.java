package com.datn.order_service.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class DailyOrderStats {
    private LocalDate date;
    private long totalOrders;
    private BigDecimal totalAmount;
    private BigDecimal totalRevenue;
}