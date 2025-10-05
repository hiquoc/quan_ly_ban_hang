package com.doan.staff_service.repositories;

import com.doan.staff_service.models.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff,Long> {
    Optional<Staff> getStaffByFullName(String fullName);
    Optional<Staff> getStaffByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByEmailAndIdNot(String email,Long id);
    boolean existsByPhoneAndIdNot(String phone,Long id);
}
