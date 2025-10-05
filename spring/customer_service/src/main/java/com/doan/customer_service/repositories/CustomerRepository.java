package com.doan.customer_service.repositories;

import com.doan.customer_service.models.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer,Long> {
    Optional<Customer> getCustomerByFullName(String fullName);
    Optional<Customer> getCustomerByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}
