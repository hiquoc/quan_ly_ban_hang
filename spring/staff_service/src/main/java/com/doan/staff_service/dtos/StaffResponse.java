package com.doan.staff_service.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StaffResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private OffsetDateTime createdAt;
    private Long warehouseId;
}
