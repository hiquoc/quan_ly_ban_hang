package com.datn.order_service.service;

import com.datn.order_service.client.ProductServiceClient;
import com.datn.order_service.dto.response.dashboard.*;
import com.datn.order_service.repository.OrderItemRepository;
import com.datn.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderDashboardService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository itemRepository;
    private final ProductServiceClient productServiceClient;

    public OrderDashboardResponse getDashboard(OffsetDateTime from, OffsetDateTime to) {
        try {
            // --- Current period ---
            List<Object[]> result = orderRepository.getOrderSummary(from, to);
            Object[] summary = result.isEmpty() ? new Object[]{0L, 0.0} : result.get(0);
            if (summary == null) {
                log.warn("No summary returned from repository");
                summary = new Object[]{0L, 0.0};
            }

            long totalOrders = ((Number) summary[0]).longValue();
            double totalRevenue = ((Number) summary[1]).doubleValue();

            long days = Duration.between(from.toLocalDate().atStartOfDay(), to.toLocalDate().atStartOfDay()).toDays() + 1;
            OffsetDateTime prevFrom = from.minusDays(days);
            OffsetDateTime prevTo   = to.minusDays(days);

            List<Object[]> preResult = orderRepository.getOrderSummary(prevFrom, prevTo);
            Object[] preSummary = preResult.isEmpty() ? new Object[]{0L, 0.0} : preResult.get(0);
            if (preSummary == null) {
                log.warn("No summary returned from repository for previous period");
                preSummary = new Object[]{0L, 0.0};
            }

            long prevTotalOrders = ((Number) preSummary[0]).longValue();
            double prevTotalRevenue = ((Number) preSummary[1]).doubleValue();
            OrderStats orderStats=new OrderStats(totalOrders, totalRevenue,prevTotalOrders,prevTotalRevenue);

            Map<String, Long> ordersByStatus = new HashMap<>();
            for (Object[] r : orderRepository.getOrderStatusStats(from, to)) {
                ordersByStatus.put((String) r[0], ((Number) r[1]).longValue());
            }

            List<DailyOrderStats> dailyStats = orderRepository.getDailyStats(from, to)
                    .stream()
                    .map(r -> new DailyOrderStats(
                            ((java.sql.Date) r[0]).toLocalDate(),
                            ((Number) r[1]).longValue(),
                            (BigDecimal) r[2],
                            (BigDecimal) r[3]
                    )).toList();

            //Top product
            List<Object[]> topProductsRaw = itemRepository.getTopProduct(from, to,PageRequest.of(0, 5));
            List<TopProduct> topProducts = topProductsRaw.stream()
                    .map(r -> new TopProduct(
                            ((Number) r[0]).longValue(),
                            ((Number) r[1]).longValue(),
                            (String) r[2],
                            (String) r[3],
                            (String) r[4]
                    )).toList();
            List<Object[]> topVariantsRaw = itemRepository.getTopVariant(from, to,PageRequest.of(0, 5));
            List<TopVariant> topVariants = topVariantsRaw.stream()
                    .map(r -> new TopVariant(
                            ((Number) r[0]).longValue(),
                            ((Number) r[1]).longValue(),
                            (String) r[2],
                            (String) r[3]
                    )).toList();

            OrderDashboardResponse response = new OrderDashboardResponse(orderStats,
                    ordersByStatus, dailyStats,topProducts,topVariants);

            log.info("Dashboard response: {}", response);
            return response;

        } catch (Exception e) {
            log.error("Error building dashboard", e);
            throw new RuntimeException(e);
        }
    }
}
