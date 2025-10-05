package com.doan.auth_service.models;

import jakarta.persistence.*;

@Entity
@Table(name = "social_accounts")
public class SocialAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String providerId;
}

