package com.quanlybanhang.banhang_system.mappers;

import com.quanlybanhang.banhang_system.dtos.Customer.CustomerRequest;
import com.quanlybanhang.banhang_system.dtos.Customer.CustomerResponse;
import com.quanlybanhang.banhang_system.models.Customer;
import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

import java.util.List;


@Mapper(componentModel="spring",uses=AddressMapper.class)
public interface CustomerMapper {
    CustomerResponse toResponse(Customer customer);
    List<CustomerResponse> toResponseList(List<Customer> customers);
    Customer toEntity(CustomerRequest request);
}
