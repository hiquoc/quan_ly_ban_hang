package com.doan.inventory_service.models;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    private int quantity;
    private BigDecimal importPrice;
    private BigDecimal subtotal;

    public PurchaseOrderItem (PurchaseOrder purchaseOrder,Long variantId,int quantity,BigDecimal importPrice,BigDecimal subtotal){
        this.purchaseOrder=purchaseOrder;
        this.variantId=variantId;
        this.quantity=quantity;
        this.importPrice=importPrice;
        this.subtotal=subtotal;
    }
}