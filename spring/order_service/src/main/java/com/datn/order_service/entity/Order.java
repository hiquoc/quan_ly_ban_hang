package com.datn.order_service.entity;

import com.datn.order_service.enums.PaymentStatus;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Map;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_number", nullable = false, unique = true, length = 50)
    private String orderNumber;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    // Order amounts
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 15, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "revenue", precision = 15, scale = 2)
    private BigDecimal revenue;

    @Column(name = "promotion_code", length = 50)
    private String promotionCode;

    // Status
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "shipping_name", nullable = false, length = 100)
    private String shippingName;

    @Column(name = "shipping_address", nullable = false, length = 500)
    private String shippingAddress;

    @Column(name = "shipping_phone", length = 20)
    private String shippingPhone;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod;

    // Dates
    @Column(name = "order_date")
    private OffsetDateTime orderDate = OffsetDateTime.now();

    @Column(name = "shipped_date")
    private OffsetDateTime shippedDate;

    @Column(name = "delivered_date")
    private OffsetDateTime deliveredDate;

    @Column(name = "cancelled_date")
    private OffsetDateTime cancelledDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}