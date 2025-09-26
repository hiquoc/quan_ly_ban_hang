package com.doan.customer_service.dtos;

import lombok.Data;

@Data
public class CustomerRequest {
    private String fullName;
    private String phone;
    private String email;
}
