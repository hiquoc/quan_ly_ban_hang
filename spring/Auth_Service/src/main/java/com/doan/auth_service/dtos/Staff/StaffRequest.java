package com.doan.auth_service.dtos.Staff;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StaffRequest {
    private String fullName;
    private String phone;
    private String email;
    private Long warehouseId;
}
