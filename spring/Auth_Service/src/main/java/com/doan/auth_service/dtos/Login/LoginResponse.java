package com.doan.auth_service.dtos.Login;

import lombok.Data;

@Data
public class LoginResponse {
    private String username;
    private String role;
    private String token;
}
