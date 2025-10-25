package com.doan.inventory_service.models;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false,unique = true)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    private String transactionType; // IMPORT, EXPORT, ADJUST,RESERVE
    private int quantity;
    private BigDecimal pricePerItem;
    private String note;
    @Column(name = "reference_type", nullable = true)
    private String referenceType;   // e.g., ORDER, PURCHASE_ORDER
    @Column(name = "reference_id", nullable = true)
    private String referenceCode;       // Code of related order or purchase

    private Long createdBy;
    private Long updatedBy;
    private String status;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public InventoryTransaction(String code,Inventory inventory,String transactionType,int quantity,BigDecimal pricePerItem,
                                String note,String referenceType,String referenceCode,Long createdBy){
        this.code=code;
        this.inventory=inventory;
        this.transactionType=transactionType;
        this.quantity=quantity;
        this.pricePerItem=pricePerItem;
        this.note=note;
        this.referenceType=referenceType;
        this.referenceCode=referenceCode;
        this.createdBy=createdBy;
        this.status="PENDING";
    }
}