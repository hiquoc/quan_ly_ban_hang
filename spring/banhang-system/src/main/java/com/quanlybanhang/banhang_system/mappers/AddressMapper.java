package com.quanlybanhang.banhang_system.mappers;

import com.quanlybanhang.banhang_system.dtos.Address.AddressRequest;
import com.quanlybanhang.banhang_system.dtos.Address.AddressResponse;
import com.quanlybanhang.banhang_system.models.Address;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface AddressMapper {
    AddressResponse toResponse(Address address);
    List<AddressResponse> toResponseList(List<Address> addresses);
    Address toEntity(AddressRequest request);
}
