package com.doan.inventory_service.dtos.transaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryTransactionRequest {
    @NotNull(message = "Vui lòng nhập mã biến thể!")
    private Long variantId;
    @NotNull(message = "Vui lòng nhập mã kho chứa!")
    private Long warehouseId;
    @NotBlank(message = "Vui lòng nhập loại phiếu!")
    private String transactionType;
    @NotNull(message = "Vui lòng nhập số lượng!")
    private Integer quantity;

    private BigDecimal pricePerItem;

    private String note;
    private String referenceType;
    private String referenceCode;

    public InventoryTransactionRequest(Long variantId, Long warehouseId, String transactionType, int quantity, BigDecimal pricePerItem, String referenceType, String referenceCode) {
        this.variantId=variantId;
        this.warehouseId=warehouseId;
        this.transactionType=transactionType;
        this.quantity=quantity;
        this.pricePerItem=pricePerItem;
        this.referenceType=referenceType;
        this.referenceCode=referenceCode;
    }
}
