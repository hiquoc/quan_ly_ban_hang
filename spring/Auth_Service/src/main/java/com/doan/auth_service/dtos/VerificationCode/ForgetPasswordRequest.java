package com.doan.auth_service.dtos.VerificationCode;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ForgetPasswordRequest {
    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Mã xác thực không được để trống")
    private String code;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    private String newPassword;

}
