package com.doan.inventory_service.dtos.inventory;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class InventoryQuantityChangeDailyResponse {
    private LocalDate date;
    private int quantity;
    private int runningTotal;
}