package com.quanlybanhang.banhang_system.dtos.Customer;

import java.util.List;

import com.quanlybanhang.banhang_system.dtos.Address.AddressResponse;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {
    private Long id;
    private String name;
    private String phone;
    private String email;
    private List<AddressResponse> addresses;
}
