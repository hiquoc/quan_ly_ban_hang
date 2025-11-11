package com.datn.order_service.repository;

import com.datn.order_service.entity.ReturnOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnOrderRepository extends JpaRepository<ReturnOrder,Long> {
}
