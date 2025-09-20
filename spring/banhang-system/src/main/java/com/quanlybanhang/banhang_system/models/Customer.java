package com.quanlybanhang.banhang_system.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String email;
    private String phone;
    private LocalDateTime createdAt= LocalDateTime.now();

    @OneToMany(mappedBy = "customer",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<Address> address=new ArrayList<>();

    @OneToMany(mappedBy = "customer",cascade = CascadeType.ALL)
    private List<Order> orders=new ArrayList<>();

}
