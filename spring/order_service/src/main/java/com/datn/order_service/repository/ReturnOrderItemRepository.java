package com.datn.order_service.repository;

import com.datn.order_service.entity.ReturnOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReturnOrderItemRepository extends JpaRepository<ReturnOrderItem,Long> {
    List<ReturnOrderItem> findByReturnOrderId(Long id);
}
