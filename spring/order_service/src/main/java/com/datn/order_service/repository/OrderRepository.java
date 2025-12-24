package com.datn.order_service.repository;

import com.datn.order_service.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
            WHERE delivered_date >= :from AND delivered_date < :to
              AND (:statusId IS NULL OR status_id = :statusId)
            """, nativeQuery = true)
    List<Object[]> getOrderSummary(@Param("from") OffsetDateTime from,
                                   @Param("to") OffsetDateTime to,
                                   @Param("statusId") Long statusId);

    @Query("""
            SELECT o.status.name, COUNT(o)
            FROM Order o
            WHERE o.orderDate >= :from AND o.orderDate < :to
            GROUP BY o.status.name
            """)
    List<Object[]> getOrderStatusStats(@Param("from") OffsetDateTime from,
                                       @Param("to") OffsetDateTime to);

    @Query(value = """
            SELECT DATE(delivered_date) AS delivered_date,
                   COUNT(*) AS total_orders,
                   COALESCE(SUM(total_amount),0) AS total_amount,
                   COALESCE(SUM(revenue),0) AS total_revenue
            FROM orders
            WHERE delivered_date >= :from AND delivered_date < :to
              AND (:statusId IS NULL OR status_id = :statusId)
            GROUP BY DATE(delivered_date)
            ORDER BY DATE(delivered_date)
            """, nativeQuery = true)
    List<Object[]> getDailyStats(@Param("from") OffsetDateTime from,
                                 @Param("to") OffsetDateTime to,
                                 @Param("statusId") Long statusId);

    List<Order> findByUserConfirmedAtIsNullAndDeliveredDateBefore(OffsetDateTime cutoff);
}