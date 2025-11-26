package com.doan.product_service.repositories;

import com.doan.product_service.models.Brand;
import com.doan.product_service.models.PendingAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PendingActionRepository extends JpaRepository<PendingAction,Long>{

    List<PendingAction> findByTimestampBefore(Instant timestamp);

    Optional<PendingAction> findByImageUrl(String imageUrl);
}
