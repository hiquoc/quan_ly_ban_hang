package com.doan.customer_service.repositories;

import com.doan.customer_service.models.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address,Long> {
    List<Address> findByCustomerId(Long customerId);
    Optional<Address> findByCustomerIdAndIsMainIsTrue(Long customerId);
}
