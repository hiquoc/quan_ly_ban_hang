package com.doan.customer_service.services;

import com.doan.customer_service.dtos.AddressRequest;
import com.doan.customer_service.dtos.CustomerRequest;
import com.doan.customer_service.models.Address;
import com.doan.customer_service.models.Customer;
import com.doan.customer_service.repositories.AddressRepository;
import com.doan.customer_service.repositories.CustomerRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class CustomerService {
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    public Customer createCustomer(CustomerRequest request){
        Customer customer=new Customer(request.getFullName().trim()
                ,request.getEmail().trim(), request.getPhone().trim());
        return customerRepository.save(customer);
    }
    public Customer getCustomerById(Long id){
        return customerRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với id: "+id));
    }
    public List<Customer> getAllCustomers(){
        return customerRepository.findAll();
    }
    public Customer getCustomerByEmail(String email){
        return customerRepository.getCustomerByEmail(email)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với Email!"));
    }
    public void updateCustomer (Long id,CustomerRequest request){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy khách hàng với id: "+id));
        if(!Objects.equals(request.getFullName(), "") && !Objects.equals(request.getFullName(), customer.getFullName()))
            customer.setFullName(request.getFullName());
        if(!Objects.equals(request.getPhone(), "") && !Objects.equals(request.getPhone(), customer.getPhone()))
            customer.setPhone(request.getPhone());
        if(!Objects.equals(request.getEmail(), "") && !Objects.equals(request.getEmail(), customer.getEmail()))
            customer.setEmail(request.getEmail());
        if(request.getDateOfBirth()!=null && !Objects.equals(request.getDateOfBirth(), customer.getDateOfBirth()))
            customer.setDateOfBirth(request.getDateOfBirth());
        if(!Objects.equals(request.getGender(), "") && !Objects.equals(request.getGender(), customer.getGender()))
            customer.setGender(request.getGender());
        customerRepository.save(customer);
    }
    public void deleteCustomer(Long id){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy khách hàng với id: "+id));
        customerRepository.delete(customer);
    }
    public void checkRegisterRequest(CustomerRequest request){
        if(request.getEmail() != null && !request.getEmail().isEmpty()
                && customerRepository.existsByEmail(request.getEmail().trim())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã được sử dụng!");
        }
        if(request.getPhone() != null && !request.getPhone().isEmpty()
                && customerRepository.existsByPhone(request.getPhone().trim())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Số điện thoại đã được sử dụng!");
        }
    }
}
