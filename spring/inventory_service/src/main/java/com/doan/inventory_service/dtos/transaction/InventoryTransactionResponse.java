package com.doan.inventory_service.dtos.transaction;

import com.doan.inventory_service.models.Warehouse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InventoryTransactionResponse {
    private Long id;
    private String code;
    private Object variant;
    private Warehouse warehouse;
    private String transactionType;
    private int quantity;
    private BigDecimal pricePerItem;
    private String note;
    private String referenceType;
    private String referenceCode;
    private String status;
    private Long createdBy;
    private Long updatedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

}
