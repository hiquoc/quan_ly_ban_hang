package com.doan.auth_service.repositories;

import com.doan.auth_service.models.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account,Long> {
    Optional<Account> findByUsername(String username);
    Optional<Account> findByOwnerIdAndRole_Id(Long ownerId, Long roleId);
    Optional<Account> findByOwnerIdAndRole_IdNot(Long ownerId, Long roleId);
    boolean existsByUsername(String username);
    @Query("SELECT a FROM Account a")
    List<Account> findAllAccountsIncludingDeleted();
}
