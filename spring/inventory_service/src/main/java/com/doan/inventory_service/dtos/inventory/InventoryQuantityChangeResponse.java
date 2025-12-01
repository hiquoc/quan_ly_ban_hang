package com.doan.inventory_service.dtos.inventory;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Data
public class InventoryQuantityChangeResponse {
    private int from;
    private int to;
    private List<InventoryQuantityChangeDailyResponse> dailyChanges;
    private String sku;
    private String name;
    private String warehouseCode;
    private int totalExport;
    private int totalImport;
    private int totalAdjust;

    public InventoryQuantityChangeResponse(int from,int to,List<InventoryQuantityChangeDailyResponse> list){
        this.from=from;
        this.to=to;
        this.dailyChanges=list;
        this.totalExport=0;
        this.totalImport=0;
        this.totalAdjust=0;
    }
}
