package com.doan.customer_service.repositories;

import com.doan.customer_service.models.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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

    @Query(value = "SELECT * FROM customers s WHERE s.id::text LIKE %:idPart%", nativeQuery = true)
    List<Customer> findByIdLike(@Param("idPart") String idPart);

    @Query(value = """
            SELECT COUNT(id) AS total_customer
            FROM customers
            WHERE created_at BETWEEN :from AND :to
            """, nativeQuery = true)
    List<Object[]> getCustomerSummary(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
