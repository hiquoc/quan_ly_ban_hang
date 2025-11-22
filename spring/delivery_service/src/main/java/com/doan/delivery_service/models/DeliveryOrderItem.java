package com.doan.delivery_service.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "delivery_order_items")
public class DeliveryOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_order_id", nullable = false)
    @JsonIgnore
    private DeliveryOrder deliveryOrder;

    private Long orderItemId;
    private Long variantId;

    private String variantName;
    private String sku;

    @Column(precision = 18, scale = 2)
    private BigDecimal unitPrice;

    private String imageUrl;

    private int quantity;
}


