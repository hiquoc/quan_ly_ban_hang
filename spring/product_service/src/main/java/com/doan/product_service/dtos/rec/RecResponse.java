package com.doan.product_service.dtos.rec;

import lombok.*;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RecResponse {
    private List<Recommendation> recommendations;
}
