package com.doan.auth_service.dtos.VerificationCode;

import lombok.Data;

@Data
public class VerificationRequest {
    private String email;
    private String code; // optional for send request
}