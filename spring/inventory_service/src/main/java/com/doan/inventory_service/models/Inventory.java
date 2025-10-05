package com.doan.inventory_service.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "inventory", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"variant_id", "warehouse_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @ManyToOne
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    private int quantity;           
    private int reservedQuantity;   
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void updateTime() {
        updatedAt = OffsetDateTime.now();
    }
}