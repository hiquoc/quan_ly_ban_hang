package com.doan.user_service.repositories;

import com.doan.user_service.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User,Long> {
    Optional<User> getUserByFullName(String fullName);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}
