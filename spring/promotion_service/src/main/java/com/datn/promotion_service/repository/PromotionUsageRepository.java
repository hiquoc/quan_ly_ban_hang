package com.datn.promotion_service.repository;

import com.datn.promotion_service.entity.PromotionUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, Long> {

    List<PromotionUsage> findByPromotionId(Long promotionId);

    List<PromotionUsage> findByCustomerId(Long customerId);

    @Query("SELECT COUNT(pu) FROM PromotionUsage pu WHERE pu.promotionId = :promotionId AND pu.customerId = :customerId")
    Integer countByPromotionIdAndCustomerId(Long promotionId, Long customerId);

    boolean existsByPromotionIdAndOrderId(Long promotionId, Long orderId);

    boolean existsByPromotionId(Long id);
}