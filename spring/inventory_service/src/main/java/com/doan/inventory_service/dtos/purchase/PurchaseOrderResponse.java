package com.doan.inventory_service.dtos.purchase;

import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.models.Warehouse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderResponse {
    private Long id;
    private String code;
    private Supplier supplier;
    private Warehouse warehouse;
    private String status;
    private Long createdBy;
    private Long updatedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<PurchaseOrderItemResponse> items;
    private BigDecimal totalAmount;
}
