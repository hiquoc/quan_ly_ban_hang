package com.doan.delivery_service.repositories;

import com.doan.delivery_service.enums.DeliveryStatus;
import com.doan.delivery_service.models.DeliveryOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface DeliveryOrderRepository extends JpaRepository<DeliveryOrder,Long> {
    long countByCreatedAtBetween(OffsetDateTime startOfDay, OffsetDateTime endOfDay);

    @Query(
            value = "SELECT * FROM delivery_orders d " +
                    "WHERE (:keyword IS NULL " +
                    "       OR d.delivery_number ILIKE CONCAT('%', :keyword, '%') " +
                    "       OR d.order_number ILIKE CONCAT('%', :keyword, '%')) " +
                    "AND (:status IS NULL OR d.status = :status) " +
                    "AND (:warehouseId IS NULL OR d.warehouse_id = :warehouseId) " +
                    "ORDER BY d.created_at DESC",
            nativeQuery = true
    )
    Page<DeliveryOrder> findAllByKeywordAndWarehouseId(@Param("keyword") String keyword,
                                                       @Param("status") String status,
                                                       @Param("warehouseId") Long warehouseId,
                                                       Pageable pageable);

    List<DeliveryOrder> findByAssignedShipper_IdAndStatusIn(Long shipperId, List<DeliveryStatus> statuses);

    long countByAssignedShipper_IdAndStatusIn(Long id, List<DeliveryStatus> activeStatuses);

    Optional<DeliveryOrder> findByOrderId(Long orderId);

    Page<DeliveryOrder> findByAssignedShipper_IdAndDeliveryNumberContainingIgnoreCase(
            Long shipperId, String keyword, Pageable pageable);

    Page<DeliveryOrder> findByAssignedShipper_IdAndStatusAndDeliveryNumberContainingIgnoreCase(
            Long shipperId, DeliveryStatus status, String keyword, Pageable pageable);

}
