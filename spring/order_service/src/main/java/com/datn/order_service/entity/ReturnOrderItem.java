package com.datn.order_service.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.util.Map;

@Entity
@Table(name = "return_order_items")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReturnOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_order_id", nullable = false)
    private ReturnOrder returnOrder;

    @Column(name = "variant_id")
    private Long variantId;
    private int quantity;
    @Type(JsonBinaryType.class)
    @Column(name = "product_snapshot", columnDefinition = "jsonb")
    private Map<String,Object> productSnapshot;
}
