package com.doan.inventory_service.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "suppliers")
@Data
@NoArgsConstructor
public class Supplier {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String name;
    @Column(unique = true)
    private String code;
    @Column(unique = true)
    private String phone;
    @Column(unique = true)
    private String email;
    private String address;
    @Column(name = "tax_code",unique = true)
    private String taxCode;

    private String description;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;



    @PrePersist
    public void prePersist() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Supplier (String name,String code,String phone,String email,String address,String taxCode,String description){
        this.name=name;
        this.code=code;
        this.phone=phone;
        this.email=email;
        this.address=address;
        this.taxCode=taxCode;
        this.description=description;
    }
    public Supplier(Long id, String code, String name) {
        this.id=id;
        this.code=code;
        this.name=name;
    }
}