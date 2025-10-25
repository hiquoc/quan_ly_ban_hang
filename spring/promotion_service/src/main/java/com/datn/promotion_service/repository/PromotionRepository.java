package com.datn.promotion_service.repository;

import com.datn.promotion_service.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long>, JpaSpecificationExecutor<Promotion> {

    Optional<Promotion> findByCode(String code);

    Optional<Promotion> findByCodeAndIsActiveTrue(String code);

    @Query("SELECT p FROM Promotion p WHERE p.isActive = true AND :now BETWEEN p.startDate AND p.endDate")
    List<Promotion> findActivePromotions(@Param("now") LocalDateTime now);

    @Query("SELECT p FROM Promotion p WHERE p.isActive = true AND p.endDate > :now ORDER BY p.endDate ASC")
    List<Promotion> findUpcomingPromotions(@Param("now") LocalDateTime now);

    @Query("SELECT p FROM Promotion p WHERE p.endDate < :now")
    List<Promotion> findExpiredPromotions(@Param("now") LocalDateTime now);

    List<Promotion> findByCreatedByStaffId(Long staffId);
}