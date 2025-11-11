package com.doan.auth_service.dtos.Login;

import lombok.Data;

@Data
public class OAuth2CodeRequest {
    private String code;
    private String state;
}