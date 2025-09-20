package com.quanlybanhang.banhang_system.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private int quantity;
    private double price;
    @ManyToOne
    private Product product;
    @ManyToOne
    @JoinColumn(name="order_id")
    private Order order;
}
