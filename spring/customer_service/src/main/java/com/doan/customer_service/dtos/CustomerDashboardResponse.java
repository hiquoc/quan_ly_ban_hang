package com.doan.customer_service.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CustomerDashboardResponse {
    private Long totalCustomers;
    private Long preTotalCustomers;
}
