package com.doan.auth_service.repositories;

import com.doan.auth_service.models.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account,Long> {
    Optional<Account> findByUsername(String username);
    boolean existsByUsername(String username);
}
