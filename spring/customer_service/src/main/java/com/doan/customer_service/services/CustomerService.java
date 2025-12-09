package com.doan.customer_service.services;

import com.doan.customer_service.dtos.CustomerRequest;
import com.doan.customer_service.dtos.CustomerResponse;
import com.doan.customer_service.models.Customer;
import com.doan.customer_service.repositories.AddressRepository;
import com.doan.customer_service.repositories.CustomerRepository;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.doan.customer_service.utils.WebhookUtils;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class CustomerService {
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    @Autowired
    private WebhookUtils webhookUtils;

    public Customer createCustomer(CustomerRequest request){
        Customer customer=new Customer(request.getFullName()!=null? request.getFullName().trim():null
                ,request.getEmail()!=null?request.getEmail().trim():null, request.getPhone()!=null?request.getPhone().trim():null);
        customerRepository.save(customer);

        webhookUtils.postToWebhook(customer.getId(),"insert");

        return customer;
    }

    public Customer getCustomerById(Long id){
        return customerRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với id: "+id));
    }
    public List<Customer> getAllCustomers(){
        return customerRepository.findAll();
    }
    public List<Customer> getCustomerByIds(List<Long> ids){
        return customerRepository.findAllByIdIn(ids);
    }
    // CustomerService.java
    public Page<Customer> getCustomerByKeyword(String keyword, String type, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        if (keyword == null || keyword.isEmpty()) {
            return customerRepository.findAll(pageable);
        }

        switch (type) {
            case "name":
                return customerRepository.findByFullNameContainingIgnoreCase(keyword, pageable);
            case "email":
                return customerRepository.findByEmailContainingIgnoreCase(keyword, pageable);
            case "phone":
                return customerRepository.findByPhoneContaining(keyword, pageable);
            default:
                // Search all fields combined
                List<Customer> result = new ArrayList<>();
                result.addAll(customerRepository.findByFullNameContainingIgnoreCase(keyword, pageable).getContent());
                result.addAll(customerRepository.findByEmailContainingIgnoreCase(keyword, pageable).getContent());
                result.addAll(customerRepository.findByPhoneContaining(keyword, pageable).getContent());
                return new PageImpl<>(result, pageable, result.size());
        }
    }

    public Customer getCustomerByEmail(String email){
        return customerRepository.getCustomerByEmail(email)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản với Email!"));
    }
    public void updateCustomer(Long id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy khách hàng với id: " + id));

        if (request.getFullName() != null && !request.getFullName().isBlank() &&
                !request.getFullName().equals(customer.getFullName())) {
            customer.setFullName(request.getFullName());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank() &&
                !request.getPhone().equals(customer.getPhone())) {
            if (customerRepository.existsByPhone(request.getPhone())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Số điện thoại đã tồn tại!" );
            }
            customer.setPhone(request.getPhone());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank() &&
                !request.getEmail().equals(customer.getEmail())) {
            if (customerRepository.existsByEmail(request.getEmail())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Email đã tồn tại!");
            }
            customer.setEmail(request.getEmail());
        }

        if (request.getDateOfBirth() != null && !request.getDateOfBirth().equals(customer.getDateOfBirth())) {
            customer.setDateOfBirth(request.getDateOfBirth());
        }

        if (request.getGender() != null && !request.getGender().isBlank() &&
                !request.getGender().equals(customer.getGender())) {
            customer.setGender(request.getGender());
        }

        customerRepository.save(customer);
        webhookUtils.postToWebhook(customer.getId(),"update");
    }

    public void deleteCustomer(Long id){
        Customer customer=customerRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Không tìm thấy khách hàng với id: "+id));
        customerRepository.delete(customer);
        webhookUtils.postToWebhook(customer.getId(),"delete");
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

    public List<CustomerResponse> getCustomerByIdLike(Long id) {
        String idPart = String.valueOf(id);
        List<Customer> customerList = customerRepository.findByIdLike(idPart);
        return customerList.stream().map(staff ->
                new CustomerResponse(staff.getId(),staff.getFullName(),staff.getEmail(),staff.getPhone(),staff.getCreatedAt())).toList();
    }

}
