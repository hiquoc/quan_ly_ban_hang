package com.datn.order_service.client.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockResponse {
    private boolean success;
    private String message;
    private Long reservationId;
    private Long productId;
    private Long variantId;
    private Integer quantityReserved;
    private Integer quantityReleased;
    private Integer availableQuantity;
}