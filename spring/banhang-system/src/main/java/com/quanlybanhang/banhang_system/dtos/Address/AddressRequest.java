package com.quanlybanhang.banhang_system.dtos.Address;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddressRequest {
    private String tinh;
    private String quan;
    private String huyen;
    private String sonha;
}
