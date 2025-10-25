package com.doan.inventory_service.dtos.purchase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderRequest {
    @NotNull(message = "Vui lòng điền nhà cung cấp!")
    private Long supplierId;
    @NotNull(message = "Vui lòng điền kho sẽ nhập!")
    private Long warehouseId;
    @NotNull(message = "Vui nhập danh sách sản phẩm!")
    @Valid
    private List<PurchaseOrderItemRequest> items;
}
