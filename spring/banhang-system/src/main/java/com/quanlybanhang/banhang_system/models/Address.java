package com.quanlybanhang.banhang_system.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tinh;
    private String quan;
    private String huyen;
    private String sonha;
    private Boolean isMain;

    @ManyToOne
    @JoinColumn(name="customer_id")
    private Customer customer;
}
