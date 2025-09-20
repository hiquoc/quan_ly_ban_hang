package com.quanlybanhang.banhang_system.dtos.Account;

import lombok.Data;

@Data
public class AccountResponse {
    private String message;
    private String username;
    private String role;
    private String token;
}
