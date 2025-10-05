package com.doan.auth_service.models;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PendingAction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String service;       // e.g., CUSTOMER_SERVICE or STAFF_SERVICE
    private Long entityId;        // ownerId of customer/staff
    private String actionType;    // e.g., DELETE
    private String status = "PENDING"; // PENDING, COMPLETED
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastAttemptAt;

}