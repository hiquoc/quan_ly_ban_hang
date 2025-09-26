package com.doan.user_service.dtos;

import lombok.Data;

@Data
public class UserRequest {
    private String fullName;
    private String phone;
    private String email;
}
