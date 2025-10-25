package com.doan.auth_service.repositories;

import com.doan.auth_service.models.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account,Long>{
    Optional<Account> findByUsername(String username);
    Optional<Account> findByOwnerIdAndRole_Id(Long ownerId, Long roleId);
    Optional<Account> findByOwnerIdAndRole_IdNot(Long ownerId, Long roleId);
    boolean existsByUsername(String username);

    Page<Account> findByIdAndRole_Id(Long id, Long roleId, Pageable pageable);
    Page<Account> findByIdAndRole_IdNot(Long id, Long excludedRoleId, Pageable pageable);
    Page<Account> findByIdAndRole_IdAndRole_Id(Long id, Long roleId1, Long roleId2, Pageable pageable);
    Page<Account> findByIdAndRole_IdNotAndRole_Id(Long id, Long excludedRoleId, Long roleId, Pageable pageable);

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
    SELECT DISTINCT a FROM Account a
    WHERE 
        ((:customerIds IS NULL OR a.ownerId IN :customerIds) AND a.role.id = 4 AND (:active IS NULL OR a.isActive = :active) AND (:roleId IS NULL OR a.role.id = :roleId))
        OR
        ((:staffIds IS NULL OR a.ownerId IN :staffIds) AND a.role.id <> 4 AND (:active IS NULL OR a.isActive = :active) AND (:roleId IS NULL OR a.role.id = :roleId))
""")
    Page<Account> findByOwnerIdsWithFilters(
            @Param("customerIds") List<Long> customerIds,
            @Param("staffIds") List<Long> staffIds,
            @Param("active") Boolean active,
            @Param("roleId") Long roleId,
            Pageable pageable
    );

}
