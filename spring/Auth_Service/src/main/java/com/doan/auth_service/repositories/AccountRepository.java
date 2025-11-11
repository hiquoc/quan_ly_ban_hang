package com.doan.auth_service.repositories;

import com.doan.auth_service.models.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByUsername(String username);

    Optional<Account> findByOwnerIdAndRole_Id(Long ownerId, Long roleId);

    Optional<Account> findByOwnerIdAndRole_IdNot(Long ownerId, Long roleId);

    boolean existsByUsername(String username);

    Page<Account> findByIdAndRole_Id(Long id, Long roleId, Pageable pageable);

    @Query("""
                SELECT a FROM Account a 
                WHERE CAST(a.id AS string) LIKE %:numberStr%
                AND (:roleId IS NULL OR a.role.id = :roleId)
            """)
    Page<Account> findByIdLikeAndRole(
            @Param("numberStr") String numberStr,
            @Param("roleId") Long roleId,
            Pageable pageable
    );

    // Username search
    Page<Account> findByUsernameContaining(String username, Pageable pageable);

    Page<Account> findByUsernameContainingAndIsActive(String username, Boolean active, Pageable pageable);

    Page<Account> findByUsernameContainingAndRole_Id(String username, Long roleId, Pageable pageable);

    Page<Account> findByUsernameContainingAndIsActiveAndRole_Id(String username, Boolean active, Long roleId, Pageable pageable);

    // Active / role filtering
    Page<Account> findByIsActive(Boolean active, Pageable pageable);

    Page<Account> findByRole_Id(Long roleId, Pageable pageable);

    Page<Account> findByIsActiveAndRole_Id(Boolean active, Long roleId, Pageable pageable);

    Page<Account> findById(Long number, Pageable pageable);

    @Query("""
                SELECT a FROM Account a
                WHERE a.ownerId IN :customerIds AND a.role.id = 4
                  AND (:active IS NULL OR a.isActive = :active)
                  AND (:roleId IS NULL OR a.role.id = :roleId)
            """)
    Page<Account> findCustomerAccounts(
            @Param("customerIds") List<Long> customerIds,
            @Param("active") Boolean active,
            @Param("roleId") Long roleId,
            Pageable pageable
    );

    @Query("""
                SELECT a FROM Account a
                WHERE a.ownerId IN :staffIds AND a.role.id <> 4
                  AND (:active IS NULL OR a.isActive = :active)
                  AND (:roleId IS NULL OR a.role.id = :roleId)
            """)
    Page<Account> findStaffAccounts(
            @Param("staffIds") List<Long> staffIds,
            @Param("active") Boolean active,
            @Param("roleId") Long roleId,
            Pageable pageable
    );


    Optional<Account> findByOwnerId(Long ownerId);

    boolean existsByIdAndIsVerified(Long id, boolean isVerified);
}
