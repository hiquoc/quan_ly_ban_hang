package com.doan.delivery_service.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "shippers")
public class Shipper {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", length = 100)
    private String fullName;

    private String phone;

    private String email;

    @Column(name="is_active")
    private Boolean isActive;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name="status")
    private String status; // ONLINE, SHIPPING, OFFLINE

    @OneToMany(mappedBy = "assignedShipper")
    @JsonIgnore
    private List<DeliveryOrder> assignedOrders;

    @CreationTimestamp
    @Column(name = "created_at", columnDefinition = "TIMESTAMP WITH TIME ZONE")
    private OffsetDateTime createdAt;
}
