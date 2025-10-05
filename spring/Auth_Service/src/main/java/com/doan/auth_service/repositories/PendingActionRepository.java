package com.doan.auth_service.repositories;

import com.doan.auth_service.models.PendingAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PendingActionRepository extends JpaRepository<PendingAction, Long> {
    List<PendingAction> findByStatus(String status);
}

