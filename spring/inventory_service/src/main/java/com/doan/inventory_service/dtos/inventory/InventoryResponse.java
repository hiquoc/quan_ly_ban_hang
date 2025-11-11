package com.doan.inventory_service.dtos.inventory;

import com.doan.inventory_service.models.Warehouse;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@Builder
public class InventoryResponse {

    private Long id;
    private Object variant;
    private Warehouse warehouse;

    private int quantity;
    private int reservedQuantity;
    private boolean isActive;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
