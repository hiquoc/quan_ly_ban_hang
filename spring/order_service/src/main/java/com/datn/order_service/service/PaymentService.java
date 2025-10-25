package com.datn.order_service.service;

import com.datn.order_service.dto.request.CreatePaymentRequest;
import com.datn.order_service.dto.response.PaymentResponse;
import com.datn.order_service.entity.Order;
import com.datn.order_service.enums.PaymentStatus;
import com.datn.order_service.exception.OrderNotFoundException;
import com.datn.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final VNPayService vnPayService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    /**
     * Create payment for order
     */
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        log.info("Creating payment for order: {}", request.getOrderNumber());

        // Validate order exists
        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + request.getOrderNumber()));

        // Check if order is already paid
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Order already paid");
        }

        // Create VNPay payment URL
        String paymentUrl = vnPayService.createPaymentUrl(request);

        return PaymentResponse.builder()
                .orderNumber(request.getOrderNumber())
                .paymentUrl(paymentUrl)
                .message("Payment URL created successfully")
                .build();
    }

    /**
     * Handle VNPay callback
     */
    @Transactional
    public void handleVNPayCallback(Map<String, String> vnpParams) {
        String orderNumber = vnpParams.get("vnp_TxnRef");
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String transactionNo = vnpParams.get("vnp_TransactionNo");

        log.info("VNPay callback - Order: {}, ResponseCode: {}, TransactionNo: {}",
                orderNumber, responseCode, transactionNo);

        // Verify callback signature
        if (!vnPayService.verifyCallback(vnpParams)) {
            log.error("Invalid VNPay callback signature for order: {}", orderNumber);
            throw new RuntimeException("Invalid payment callback");
        }

        // Get order
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderNumber));

        // Update payment status based on response code
        if ("00".equals(responseCode)) {
            // Payment successful
            orderService.updatePaymentStatus(order.getId(), PaymentStatus.PAID);
            log.info("Payment successful for order: {}", orderNumber);
        } else {
            // Payment failed
            orderService.updatePaymentStatus(order.getId(), PaymentStatus.FAILED);
            log.warn("Payment failed for order: {} - Code: {}", orderNumber, responseCode);
        }
    }
}