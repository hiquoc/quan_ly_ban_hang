package com.doan.customer_service.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;


@Data
@AllArgsConstructor
public class AddressRequest {
    private Long customerId;
    private String name;
    private String phone;
    private String street;
    private String ward;
    private String district;
    private String city;
}
