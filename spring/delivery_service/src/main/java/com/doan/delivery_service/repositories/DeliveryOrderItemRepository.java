package com.doan.delivery_service.repositories;

import com.doan.delivery_service.models.DeliveryOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryOrderItemRepository extends JpaRepository<DeliveryOrderItem,Long> {
}
