package com.doan.customer_service.dtos;

import jakarta.persistence.Column;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CustomerRequest {
    private String fullName;
    private String phone;
    private String email;

    private LocalDate dateOfBirth;
    private String gender;
}
