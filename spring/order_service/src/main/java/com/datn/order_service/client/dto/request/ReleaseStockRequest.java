package com.datn.order_service.client.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReleaseStockRequest {
    @NotBlank(message = "Reason is required")
    private String reason; // ORDER_CANCELLED, ORDER_COMPLETED, etc.
}