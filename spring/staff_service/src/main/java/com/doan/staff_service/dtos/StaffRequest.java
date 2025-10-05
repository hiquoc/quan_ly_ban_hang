package com.doan.staff_service.dtos;

import lombok.Data;

@Data
public class StaffRequest {
    private String fullName;
    private String phone;
    private String email;
}
