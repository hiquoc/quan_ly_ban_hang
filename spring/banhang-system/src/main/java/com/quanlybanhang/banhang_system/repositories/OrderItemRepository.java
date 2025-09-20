package com.quanlybanhang.banhang_system.repositories;

import com.quanlybanhang.banhang_system.models.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem,Long> {
}
