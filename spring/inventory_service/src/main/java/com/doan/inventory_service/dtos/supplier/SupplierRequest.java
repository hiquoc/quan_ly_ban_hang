package com.doan.inventory_service.dtos.supplier;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SupplierRequest {
    @NotBlank(message = "Vui lòng điền tên nhà cung cấp!")
    private String name;

    @NotBlank(message = "Vui lòng điền mã nhà cung cấp!")
    private String code;

    @NotBlank(message = "Vui lòng điền số điện thoại nhà cung cấp!")
    private String phone;

//    @NotBlank(message = "Vui lòng điền email nhà cung cấp!")
    private String email;

    @NotBlank(message = "Vui lòng điền địa chỉ nhà cung cấp!")
    private String address;

    @NotBlank(message = "Vui lòng điền mã số thuế nhà cung cấp!")
    private String taxCode;

    private String description;
}

