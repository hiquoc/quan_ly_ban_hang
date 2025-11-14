package com.doan.product_service.dtos.rec;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecRequest {
    private int customer_id;
    private int k;
    private int n;

}
