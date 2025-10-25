package com.datn.order_service.enums;

public enum PaymentStatus {
    PENDING,        // Chờ thanh toán
    PAID,          // Đã thanh toán
    FAILED,        // Thanh toán thất bại
    REFUNDED,      // Đã hoàn tiền
    CANCELLED      // Đã hủy
}