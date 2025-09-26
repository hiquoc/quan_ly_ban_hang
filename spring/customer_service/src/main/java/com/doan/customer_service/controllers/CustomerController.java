package com.doan.customer_service.controllers;

import com.doan.customer_service.dtos.CustomerRequest;
import com.doan.customer_service.models.Customer;
import com.doan.customer_service.services.CustomerService;
import com.doan.customer_service.dtos.OwnerIdResponse;
import com.doan.customer_service.dtos.CustomerResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class CustomerController {
    private final CustomerService customerService;

    @PostMapping("/internal/customers")
    public ResponseEntity<?> createCustomer(@RequestBody CustomerRequest customerRequest){
        try{
            customerService.checkRegisterRequest(customerRequest);
            Customer customer=customerService.createCustomer(customerRequest);
            System.out.println("Created Customer: " + customerRequest.getFullName());

            OwnerIdResponse response=new OwnerIdResponse();
            response.setOwnerId(customer.getId());
            return ResponseEntity.ok(response);
        } catch (ResponseStatusException ex) {
            Map<String,Object> error = new HashMap<>();
            error.put("message", ex.getReason());
            error.put("success", false);
            return ResponseEntity.status(ex.getStatusCode()).body(error);
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/secure/customers")
    public List<CustomerResponse> getAllCustomers(){
        List<Customer> usersList=customerService.getAllCustomers();
        return usersList.stream()
                .map(user->new CustomerResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }
    @DeleteMapping("")
    public void deleteCustomer(Long id){
        customerService.deleteCustomer(id);
    }
}
