package com.doan.inventory_service.dtos.inventory;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InventoryResponseForVariant {
    private Long variantId;
    private String warehouseName;
    private int quantity;
    private int reservedQuantity;
}
