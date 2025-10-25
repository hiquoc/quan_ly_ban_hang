package com.doan.inventory_service.dtos.warehouse;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WarehouseRequest {
    @NotBlank(message = "Vui lòng điền tên kho!")
    private String name;
    @NotBlank(message = "Vui lòng điền mã kho!")
    private String code;
    @NotBlank(message = "Vui lòng điền địa chỉ kho!")
    private String address;
    private String description;
}

