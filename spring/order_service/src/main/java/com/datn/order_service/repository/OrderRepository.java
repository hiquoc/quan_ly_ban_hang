package com.datn.order_service.repository;

import com.datn.order_service.entity.Order;
import com.datn.order_service.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    List<Order> findByCustomerId(Long customerId);

    Page<Order> findByCustomerId(Long customerId, Pageable pageable);

    Page<Order> findByStatusId(Long statusId, Pageable pageable);

    Page<Order> findByPaymentStatus(PaymentStatus paymentStatus, Pageable pageable);

    List<Order> findByOrderDateBetween(LocalDateTime start, LocalDateTime end);

    Page<Order> findByStatus_NameAndOrderDateBetween(String status, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<Order> findByOrderDateBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<Order> findByStatus_Name(String status, Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.customerId = :customerId")
    Long countByCustomerId(Long customerId);

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.customerId = :customerId AND o.paymentStatus = 'PAID'")
    BigDecimal sumTotalAmountByCustomerId(Long customerId);

    @Query("""
                SELECT o FROM Order o
                JOIN o.status s
                WHERE o.customerId = :customerId
                AND (:statusName IS NULL OR s.name = :statusName)
                ORDER BY o.createdAt DESC
            """)
    Page<Order> findByCustomerIdAndStatus(
            @Param("customerId") Long customerId,
            @Param("statusName") String statusName,
            Pageable pageable
    );

}