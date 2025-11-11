package com.datn.order_service.repository;

import com.datn.order_service.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);


    Page<Order> findByStatusId(Long statusId, Pageable pageable);


    @Query("SELECT COUNT(o) FROM Order o WHERE o.customerId = :customerId")
    Long countByCustomerId(Long customerId);

    @Query("SELECT SUM(o.totalAmount) FROM Order o WHERE o.customerId = :customerId AND o.paymentStatus = 'PAID'")
    BigDecimal sumTotalAmountByCustomerId(Long customerId);

    @Query("""
                SELECT o FROM Order o
                JOIN o.status s
                WHERE o.customerId = :customerId
                AND (:statusName IS NULL OR s.name = :statusName)
                ORDER BY o.id DESC
            """)
    Page<Order> findByCustomerIdAndStatus(@Param("customerId") Long customerId, @Param("statusName") String statusName, Pageable pageable);

    @Query(value = """
            SELECT COUNT(id) AS total_orders,
                   COALESCE(SUM(revenue), 0) AS total_revenue
            FROM orders
            WHERE delivered_date BETWEEN :from AND :to
              AND status_id = 5
            """, nativeQuery = true)
    List<Object[]> getOrderSummary(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);


    @Query("""
            SELECT o.status.name, COUNT(o)
            FROM Order o
            WHERE o.createdAt BETWEEN :from AND :to
            GROUP BY o.status.name
            """)
    List<Object[]> getOrderStatusStats(OffsetDateTime from, OffsetDateTime to);


    @Query(value = """
                 SELECT DATE(o.created_at) AS order_date,
                   COUNT(*) AS total_orders,
                   COALESCE(SUM(o.total_amount),0) AS total_amount,
                   COALESCE(SUM(o.revenue),0) AS total_revenue
                    FROM orders o
                    WHERE o.delivered_date BETWEEN :from AND :to
                      AND o.status_id = 5
                    GROUP BY DATE(o.created_at)
                    ORDER BY DATE(o.created_at);
            """, nativeQuery = true)
    List<Object[]> getDailyStats(@Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);


}