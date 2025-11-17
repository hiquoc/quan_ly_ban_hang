package com.doan.product_service.dtos.rec;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecRequest {
    private Integer customer_id;
    private int n;
}
