package com.doan.auth_service.dtos.Account;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChangePasswordRequest {
    private String newPassword;
    private String oldPassword;
}
