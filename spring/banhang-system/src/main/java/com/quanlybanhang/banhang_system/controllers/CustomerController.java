package com.quanlybanhang.banhang_system.controllers;

import com.quanlybanhang.banhang_system.dtos.Address.AddressRequest;
import com.quanlybanhang.banhang_system.dtos.Address.AddressResponse;
import com.quanlybanhang.banhang_system.dtos.Customer.CustomerRequest;
import com.quanlybanhang.banhang_system.dtos.Customer.CustomerResponse;
import com.quanlybanhang.banhang_system.mappers.AddressMapper;
import com.quanlybanhang.banhang_system.mappers.CustomerMapper;
import com.quanlybanhang.banhang_system.models.Address;
import com.quanlybanhang.banhang_system.models.Customer;
import com.quanlybanhang.banhang_system.services.CustomerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {
    private final CustomerService customerService;
    private final CustomerMapper customerMapper;
    private final AddressMapper addressMapper;
    public CustomerController(CustomerService customerService,CustomerMapper customerMapper,AddressMapper addressMapper){
        this.customerService=customerService;
        this.customerMapper=customerMapper;
        this.addressMapper=addressMapper;
    }
    //Customer
    @GetMapping
    public List<CustomerResponse> getAllCustomers(){
        return customerMapper.toResponseList(customerService.getAllCustomer()) ;
    }

    @GetMapping("/{id}")
    public CustomerResponse getCustomer(@PathVariable Long id){
        return customerMapper.toResponse(customerService.getCustomerById(id));
    }
    @PostMapping
    public CustomerResponse createCustomer(@Valid @RequestBody CustomerRequest request){
        Customer customer=customerMapper.toEntity(request);
        return customerMapper.toResponse(customerService.createCustomer(customer));
    }
    @PostMapping("/{id}")
    public CustomerResponse updateCustomer(@PathVariable Long id,@Valid @RequestBody CustomerRequest requestDetails){
        Customer customerDetails=customerMapper.toEntity(requestDetails);
        return customerMapper.toResponse(customerService.updateCustomer(id,customerDetails));
    }
    @DeleteMapping("/{id}")
    public void deleteCustomer(@PathVariable Long id){
        customerService.deleteCustomer(id);
    }

    //Address
    @GetMapping("{id}/addresses")
    public List<AddressResponse> getAllCustomerAddresses(@PathVariable Long id){
        return addressMapper.toResponseList(customerService.getAllCustomerAddresses(id));
    }
    @PostMapping("/{id}/addresses")
    public AddressResponse addAddress(@PathVariable Long id,@RequestBody AddressRequest addressRequest){
        Address address=addressMapper.toEntity(addressRequest);
        return addressMapper.toResponse(customerService.addAddressToCustomer(id,address));
    }
    @GetMapping("{id}/addresses/{addressId}")
    public AddressResponse getAddress(@PathVariable Long id,@PathVariable Long addressId){
        return addressMapper.toResponse(customerService.getCustomerAddressById(id,addressId));
    }
    @PostMapping("/{id}/addresses/{addressId}")
    public AddressResponse updateAddress(@PathVariable Long id,@PathVariable Long addressId,@RequestBody AddressRequest requestDetails){
        Address addressDetails=addressMapper.toEntity(requestDetails);
        return addressMapper.toResponse(customerService.updateCustomerAddress(id,addressId,addressDetails));
    }
    @PutMapping("{id}/addresses/{addressId}/main")
    public void changeMainAddress(@PathVariable Long id,@PathVariable Long addressId){
        customerService.changeMainAddress(id,addressId);
    }
}
