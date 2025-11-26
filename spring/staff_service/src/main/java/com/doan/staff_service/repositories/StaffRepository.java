package com.doan.staff_service.repositories;

import com.doan.staff_service.models.Staff;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff,Long> {
    Optional<Staff> getStaffByFullName(String fullName);
    Optional<Staff> getStaffByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByEmailAndIdNot(String email,Long id);
    boolean existsByPhoneAndIdNot(String phone,Long id);

    List<Staff> findAllByIdIn(List<Long> ids);

    Page<Staff> findByFullNameContainingIgnoreCase(String fullName, Pageable pageable);
    Page<Staff> findByEmailContainingIgnoreCase(String email, Pageable pageable);
    Page<Staff> findByPhoneContaining(String phone, Pageable pageable);

    @Query(value = "SELECT * FROM staffs s WHERE s.id::text LIKE %:idPart%", nativeQuery = true)
    List<Staff> findByIdLike(@Param("idPart") String idPart);


    @Query(value = "SELECT * FROM staffs s " +
            "WHERE (:keyword IS NULL OR s.id::text = :keyword " +
            "   OR s.full_name ILIKE CONCAT('%', :keyword, '%') " +
            "   OR s.email ILIKE CONCAT('%', :keyword, '%') " +
            "   OR s.phone ILIKE CONCAT('%', :keyword, '%')) " +
            "   AND (:active IS NULL OR s.is_active = :active)" +
            "   AND (:warehouseId IS NULL OR s.warehouse_id = :warehouseId)"+
            "   ORDER BY s.created_at DESC",
            nativeQuery = true)
    Page<Staff> findAllByKeywordAndStatusAndWarehouseId(@Param("keyword") String keyword,
                                                        @Param("warehouseId") Long warehouseId,
                                                        @Param("active") Boolean active,
                                                        Pageable pageable);
}
