package com.datn.order_service.config;

import com.datn.order_service.entity.OrderStatus;
import com.datn.order_service.repository.OrderStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final OrderStatusRepository orderStatusRepository;

    @Override
    public void run(String... args) {
        // Initialize Order Statuses
        if (orderStatusRepository.count() == 0) {
            List<OrderStatus> statuses = List.of(
                    OrderStatus.builder().name("PENDING").description("Đơn hàng đang chờ xử lý").isActive(true).build(),
                    OrderStatus.builder().name("CONFIRMED").description("Đơn hàng đã xác nhận").isActive(true).build(),
                    OrderStatus.builder().name("PROCESSING").description("Đang chuẩn bị hàng").isActive(true).build(),
                    OrderStatus.builder().name("SHIPPED").description("Đã giao cho đơn vị vận chuyển").isActive(true).build(),
                    OrderStatus.builder().name("DELIVERED").description("Đã giao hàng thành công").isActive(true).build(),
                    OrderStatus.builder().name("CANCELLED").description("Đơn hàng đã hủy").isActive(true).build(),
                    OrderStatus.builder().name("RETURNED").description("Đã trả hàng").isActive(true).build()
            );
            orderStatusRepository.saveAll(statuses);
        }
    }
}