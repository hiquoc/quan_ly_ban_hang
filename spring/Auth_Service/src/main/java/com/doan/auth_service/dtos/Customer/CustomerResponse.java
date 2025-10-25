package com.doan.auth_service.dtos.Customer;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
public class CustomerResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private OffsetDateTime createdAt;
}