package com.doan.auth_service.repositories;

import com.doan.auth_service.models.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findByEmailAndCode(String email, String code);
    List<VerificationCode> findByExpiryTimeBefore(LocalDateTime time);

    int countByEmailAndExpiryTimeAfter(String email, LocalDateTime now);

    boolean existsByEmailAndIsVerified(String email, boolean b);

    List<VerificationCode> findTop100ByExpiryTimeBefore(LocalDateTime now);
}