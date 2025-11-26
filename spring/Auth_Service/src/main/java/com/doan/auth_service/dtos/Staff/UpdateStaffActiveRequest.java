package com.doan.auth_service.dtos.Staff;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateStaffActiveRequest {
    @NotNull(message = "Staff ID không được để trống")
    private Long staffId;
    @NotNull(message = "Current role ID không được để trống")
    private Long currentRoleId;
    @NotNull(message = "Target role ID không được để trống")
    private Long targetRoleId;
    private String role;
}
