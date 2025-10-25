package com.datn.order_service.controller;

import com.datn.order_service.dto.response.ApiResponse;
import com.datn.order_service.entity.OrderStatus;
import com.datn.order_service.repository.OrderStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/order-statuses")
@RequiredArgsConstructor
public class OrderStatusController {

    private final OrderStatusRepository orderStatusRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderStatus>>> getAllStatuses() {
        List<OrderStatus> statuses = orderStatusRepository.findAll();
        return ResponseEntity.ok(new ApiResponse<>("Lấy tất cả trạng thái đơn hàng thành công!", true, statuses));
    }

}