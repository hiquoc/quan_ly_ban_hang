package com.quanlybanhang.banhang_system.repositories;

import com.quanlybanhang.banhang_system.models.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AddressRepository extends JpaRepository<Address,Long> {
    List<Address> findByCustomerId(Long customerId);
}
