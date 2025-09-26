package com.doan.customer_service.services;

import com.doan.customer_service.dtos.CustomerRequest;
import com.doan.customer_service.models.Customer;
import com.doan.customer_service.repositories.CustomerRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@AllArgsConstructor
public class CustomerService {
    private final CustomerRepository customerRepository;
    public Customer createCustomer(CustomerRequest request){
        Customer customer=new Customer(request.getFullName(),request.getEmail(), request.getPhone());
        return customerRepository.save(customer);
    }
    public List<Customer> getAllCustomers(){
        return customerRepository.findAll();
    }
    public void deleteCustomer(Long id){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Customer not found with id: "+id));
        customerRepository.delete(customer);
    }
    public void checkRegisterRequest(CustomerRequest request){
        if(request.getEmail() != null && !request.getEmail().isEmpty()
                && customerRepository.existsByEmail(request.getEmail())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
        }
        if(request.getPhone() != null && !request.getPhone().isEmpty()
                && customerRepository.existsByPhone(request.getPhone())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Phone đã được sử dụng!");
        }
    }
}
