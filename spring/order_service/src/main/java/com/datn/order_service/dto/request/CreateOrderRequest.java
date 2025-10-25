package com.datn.order_service.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class    CreateOrderRequest {
    private Long customerId;

    @NotEmpty(message = "Order items cannot be empty")
    private List<OrderItemRequest> items;

    @NotBlank(message = "Shipping name is required")
    private String shippingName;

    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    @NotBlank(message = "Shipping phone is required")
    private String shippingPhone;

    @NotNull(message = "Payment method is required")
    @Pattern(regexp = "COD|VNPAY", message = "Payment method must be either COD or VNPAY")
    private String paymentMethod;

    private String promotionCode;

    private String notes;

    private Boolean clearCart;
}