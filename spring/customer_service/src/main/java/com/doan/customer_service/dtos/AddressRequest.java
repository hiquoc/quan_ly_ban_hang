package com.doan.customer_service.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;



@Data
@AllArgsConstructor
public class AddressRequest {
    private Long customerId;
    @NotBlank
    private String street;
    @NotBlank
    private String ward;
    @NotBlank
    private String district;
    @NotBlank
    private String city;
}
