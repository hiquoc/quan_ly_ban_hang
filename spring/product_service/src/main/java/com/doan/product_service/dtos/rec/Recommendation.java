package com.doan.product_service.dtos.rec;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Recommendation {
    private int product_id;
    private double score;
}