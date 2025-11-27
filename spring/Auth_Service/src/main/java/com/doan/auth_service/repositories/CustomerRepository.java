package com.doan.auth_service.repositories;

import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Customer.CustomerResponse;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.dtos.Staff.StaffResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
    name = "customer-service",
    path = "/internal/customers"
)
public interface CustomerRepository {

    @PostMapping
    ResponseEntity<OwnerIdResponse> createCustomer(@RequestBody CustomerRequest request);

    @GetMapping
    ResponseEntity<OwnerIdResponse> getCustomerIdByEmail(@RequestParam("email") String email);

    @DeleteMapping("/{id}")
    ResponseEntity<Void> deleteCustomer(@PathVariable("id") Long id);

    @GetMapping("/{id}")
    ResponseEntity<List<CustomerResponse>> getCustomerByIdLike(@PathVariable Long id);

    @GetMapping("/ids")
    ResponseEntity<List<CustomerResponse>> getCustomerByIds(@RequestParam List<Long> ids);

    @GetMapping("/keyword")
    ResponseEntity<List<CustomerResponse>> getCustomerByKeyword(@RequestParam String keyword,
                                                  @RequestParam String type,
                                                  @RequestParam Integer page,
                                                  @RequestParam Integer size);
    @GetMapping("/{id}/email")
    String getCustomerEmail(@PathVariable Long id);
}
