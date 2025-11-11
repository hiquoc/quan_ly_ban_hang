package com.datn.order_service.dto.response;

import com.datn.order_service.enums.ReturnStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@Builder
public class ReturnOrderResponse {
    private Long id;
    private Long orderId;
    private String orderNumber;
    private Long customerId;
    private String reason;
    private String inspectionNotes;
    private Long approvedBy;

    private String returnCondition;
    private ReturnStatus status;
    private BigDecimal refundAmount;
    private List<ReturnOrderItemResponse> items;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime receivedAt;
}
