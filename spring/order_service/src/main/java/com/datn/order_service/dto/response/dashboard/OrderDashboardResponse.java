package com.datn.order_service.dto.response.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@AllArgsConstructor
public class OrderDashboardResponse {
    private OrderStats orderStats;

    private Map<String, Long> ordersByStatus;

    private List<DailyOrderStats> dailyStats;

    private List<TopProduct> topProducts;

    private List<TopVariant> topVariants;
}
