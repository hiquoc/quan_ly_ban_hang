package com.doan.auth_service.services;

import com.doan.auth_service.dtos.Customer.CustomerRequest;
import com.doan.auth_service.dtos.Customer.CustomerResponse;
import com.doan.auth_service.dtos.Staff.OwnerIdResponse;
import com.doan.auth_service.repositories.CustomerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerServiceClient {

    private final CustomerRepository customerRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public OwnerIdResponse createCustomer(CustomerRequest request) {
        try {
            ResponseEntity<OwnerIdResponse> response = customerRepository.createCustomer(request);
            return response.getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public OwnerIdResponse getCustomerIdByEmail(String email) {
        try {
            ResponseEntity<OwnerIdResponse> response = customerRepository.getCustomerIdByEmail(email);
            return response.getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public void deleteCustomer(Long id) {
        try {
            customerRepository.deleteCustomer(id);
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public List<CustomerResponse> getCustomerByIdLike(Long id) {
        try {
            return customerRepository.getCustomerByIdLike(id).getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }

    public List<CustomerResponse> getCustomerByIds(List<Long> ids) {
        try {
            return customerRepository.getCustomerByIds(ids).getBody();

        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    public List<CustomerResponse> getCustomerByKeyword(String keyword, String type, int page, int size) {
        try {
            return customerRepository.getCustomerByKeyword(keyword, type, page, size).getBody();
        } catch (FeignException ex) {
            throw parseFeignException(ex);
        }
    }
    private ResponseStatusException parseFeignException(FeignException ex) {
        HttpStatus status = HttpStatus.resolve(ex.status());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;

        String errorMessage = "Lỗi không xác định";
        try {
            String body = ex.contentUTF8();
            JsonNode node = mapper.readTree(body);
            errorMessage = node.path("message").asText(errorMessage);
        } catch (Exception ignored) {}

        System.out.println("Feign Error: " + status + " - " + errorMessage);
        return new ResponseStatusException(status, errorMessage);
    }
}