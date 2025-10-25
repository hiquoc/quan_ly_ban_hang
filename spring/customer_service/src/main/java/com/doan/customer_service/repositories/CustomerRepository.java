package com.doan.customer_service.repositories;

import com.doan.customer_service.models.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer,Long> {
    Optional<Customer> getCustomerByFullName(String fullName);
    Optional<Customer> getCustomerByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    List<Customer> findAllByIdIn(List<Long> ids);
    Page<Customer> findByFullNameContainingIgnoreCase(String fullName, Pageable pageable);
    Page<Customer> findByEmailContainingIgnoreCase(String email, Pageable pageable);
    Page<Customer> findByPhoneContaining(String phone, Pageable pageable);
}
