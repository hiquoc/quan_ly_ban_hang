package com.doan.auth_service.dtos.VerificationCode;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ForgotPasswordUsernameRequest {
    @NotBlank
    private String username;
}
