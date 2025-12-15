package com.doan.auth_service.repositories;

import com.doan.auth_service.models.PendingAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface PendingActionRepository extends JpaRepository<PendingAction, Long> {
    List<PendingAction> findByStatus(String status);

    List<PendingAction> findTop50ByStatusOrderByLastAttemptAtAsc(String status);

    @Modifying
    @Transactional
    @Query("""
        update PendingAction p
        set p.lastAttemptAt = :time
        where p.id = :id
    """)
    int updateLastAttemptAt(@Param("id") Long id,
                            @Param("time") LocalDateTime time);
}
