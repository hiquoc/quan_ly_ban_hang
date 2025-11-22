package com.doan.auth_service.models;

import jakarta.persistence.*;
import jakarta.persistence.Table;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.*;

import java.time.OffsetDateTime;

@NoArgsConstructor
@Data
@Entity
@Table(name = "accounts")
@SQLDelete(sql = "UPDATE accounts SET is_deleted = true WHERE id = ?")
@Where(clause = "is_deleted = false")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false,unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @ManyToOne(optional = false)
    @JoinColumn(name = "role_id", referencedColumnName = "id")
    private Role role; //1.ADMIN,2.MANAGER,3.STAFF,4.CUSTOMER,5.SHIPPER

    @Column(name="owner_id",nullable = false)
    private Long ownerId;

    @Column(name = "is_active")
    private Boolean isActive = true;


    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    public Account(String username,String password,Long ownerId,Role role){
        this.username=username;
        this.password=password;
        this.ownerId=ownerId;
        this.role=role;
    }
}
