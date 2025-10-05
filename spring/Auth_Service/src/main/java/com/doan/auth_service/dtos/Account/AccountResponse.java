package com.doan.auth_service.dtos.Account;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AccountResponse {
    private Long id;
    private String username;
    private Long ownerId;
    private String role;
    private Boolean active;
    private OffsetDateTime createdAt;
}
