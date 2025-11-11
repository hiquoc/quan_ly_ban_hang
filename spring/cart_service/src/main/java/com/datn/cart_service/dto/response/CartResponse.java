package com.datn.cart_service.dto.response;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartResponse implements Serializable {
    private Long id;
    private Long customerId;
    private List<CartItemResponse> items;
    private Integer totalItems;
    private BigDecimal subtotal;
    private BigDecimal estimatedTotal;
}