package com.doan.auth_service.dtos.Login;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    private String username;
    @NotBlank(message = "Password is required")
    private String password;

    private String fullName;
    private String phone;
    private String email;
    private Long warehouseId;
}
