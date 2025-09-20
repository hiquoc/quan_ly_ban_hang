package com.quanlybanhang.banhang_system.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="orders")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Double price;
    private LocalDateTime createdAt=LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    private OrderStatus status = OrderStatus.PENDING;

    private String tinh;
    private String quan;
    private String huyen;
    private String sonha;

    @ManyToOne
    @JoinColumn(name="customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "order",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<OrderItem> items=new ArrayList<>();
}
enum OrderStatus{
    PENDING,
    SHIPPING,
    DELIVERED,
    CANCELED,
}
