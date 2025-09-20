package com.quanlybanhang.banhang_system.repositories;

import com.quanlybanhang.banhang_system.models.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer,Long> {
}
