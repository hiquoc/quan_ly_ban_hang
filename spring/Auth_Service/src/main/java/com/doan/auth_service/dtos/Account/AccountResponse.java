package com.doan.auth_service.dtos.Account;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
public class AccountResponse {
    private Long id;
    private String username;
    private Long ownerId;
    private String role;
    private Boolean active;
    private OffsetDateTime createdAt;

    private String fullName;
    private String email;
    private String phone;

    public AccountResponse(Long id,String username,Long ownerId,String role,Boolean active,OffsetDateTime createdAt){
        this.id=id;
        this.username=username;
        this.ownerId=ownerId;
        this.role=role;
        this.active=active;
        this.createdAt=createdAt;
    }
}
