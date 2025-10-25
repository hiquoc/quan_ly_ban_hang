package com.datn.promotion_service.exception;

public class PromotionUsageLimitException extends RuntimeException {
    public PromotionUsageLimitException(String message) {
        super(message);
    }
}