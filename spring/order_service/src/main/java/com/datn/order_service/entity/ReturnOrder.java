package com.datn.order_service.entity;

import com.datn.order_service.enums.ReturnStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "return_orders")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReturnOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private Long customerId;

    private String reason;

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, String> images;

    @Enumerated(EnumType.STRING)
    private ReturnStatus status;

    private BigDecimal refundAmount;

    @Column(name = "approved_by")
    private Long approvedBy;

    private String inspectionNotes;

    private String returnCondition;

    @Column(name = "created_at",updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_number")
    private String accountNumberEncrypted;

    @Column(name = "account_holder")
    private String accountHolder;


    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

