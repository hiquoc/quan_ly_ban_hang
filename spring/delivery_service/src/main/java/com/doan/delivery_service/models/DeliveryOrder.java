package com.doan.delivery_service.models;

import com.doan.delivery_service.enums.DeliveryStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "delivery_orders")
public class DeliveryOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="delivery_number")
    private String deliveryNumber;

    private Long orderId;

    @Column(name="order_number")
    private String orderNumber;

    @Column(name = "shipping_name", nullable = false, length = 100)
    private String shippingName;

    @Column(name = "shipping_address", nullable = false, length = 500)
    private String shippingAddress;

    @Column(name = "shipping_phone", length = 20)
    private String shippingPhone;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod;

    @Column(name="warehouse_id")
    private Long warehouseId;

    @Enumerated(EnumType.STRING)
    @Column(name="status")
    private DeliveryStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_shipper_id")
    private Shipper assignedShipper;

    @Column(name="assigned_at")
    private OffsetDateTime assignedAt;

    @Column(name="delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "delivered_image_url")
    private String deliveredImageUrl;

    @Column(name="failed_reason")
    private String failedReason;

    @Column(name="cod_amount")
    private BigDecimal codAmount;

    @OneToMany(
            mappedBy = "deliveryOrder",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<DeliveryOrderItem> itemList;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }


}

