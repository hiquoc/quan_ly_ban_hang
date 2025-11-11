package com.doan.inventory_service.dtos.inventory;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class InventoryQuantityChangeResponse {
    private int from;
    private int to;
    private List<InventoryQuantityChangeDailyResponse> dailyChanges;
}
