package com.doan.inventory_service.repositories;

import com.doan.inventory_service.models.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder,Long> {
    long countByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end);
    Page<PurchaseOrder> findByStatus(String status,Pageable pageable);
    Page<PurchaseOrder> findByStatusAndCreatedAtBetween(String status, OffsetDateTime start, OffsetDateTime end, Pageable pageable);
    Page<PurchaseOrder> findByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);
}
