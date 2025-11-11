package com.doan.product_service.dtos.order;

public enum PaymentStatus {
    PENDING,        // Chờ thanh toán
    PAID,          // Đã thanh toán
    FAILED,        // Thanh toán thất bại
    REFUNDED,      // Đã hoàn tiền
    CANCELLED      // Đã hủy
}