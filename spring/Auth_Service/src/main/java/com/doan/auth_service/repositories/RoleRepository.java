package com.doan.auth_service.repositories;

import com.doan.auth_service.models.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role,Long> {

}
