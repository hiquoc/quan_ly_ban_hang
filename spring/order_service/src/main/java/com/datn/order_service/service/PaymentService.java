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

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final VNPayService vnPayService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    /**
     * Tạo payment URL cho đơn hàng
     * User sẽ được redirect đến VNPay để nhập thông tin thẻ
     */
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        log.info("Creating payment for order: {}", request.getOrderNumber());

        // Kiểm tra đơn hàng tồn tại
        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + request.getOrderNumber()));

        // Kiểm tra đơn hàng đã thanh toán chưa
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalStateException("Order already paid: " + request.getOrderNumber());
        }

        // Tạo VNPay payment URL
        String paymentUrl = vnPayService.createPaymentUrl(request);

        return PaymentResponse.builder()
                .orderNumber(request.getOrderNumber())
                .paymentUrl(paymentUrl)
                .message("Payment URL created successfully. Redirect user to this URL.")
                .build();
    }

    /**
     * Xử lý callback từ VNPay
     * VNPay sẽ redirect user về URL này sau khi thanh toán
     */
    @Transactional
    public void handleVNPayCallback(Map<String, String> vnpParams) {
        String orderNumber = vnpParams.get("vnp_TxnRef");
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String transactionNo = vnpParams.get("vnp_TransactionNo");
        String amount = vnpParams.get("vnp_Amount");

        log.info("VNPay callback received - Order: {}, ResponseCode: {}, TransactionNo: {}, Amount: {}",
                orderNumber, responseCode, transactionNo, amount);

        // Xác thực chữ ký callback
        if (!vnPayService.verifyCallback(vnpParams)) {
            log.error("Invalid VNPay callback signature for order: {}", orderNumber);
            throw new RuntimeException("Invalid payment callback signature");
        }

        // Lấy đơn hàng
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderNumber));

        // Cập nhật trạng thái thanh toán
        if ("00".equals(responseCode)) {
            // Thanh toán thành công
            orderService.updatePaymentStatus(order.getId(), PaymentStatus.PAID);
            log.info("Payment successful for order: {} - Transaction: {}", orderNumber, transactionNo);
        } else {
            // Thanh toán thất bại
            orderService.updatePaymentStatus(order.getId(), PaymentStatus.FAILED);
            String errorMessage = vnPayService.getResponseMessage(responseCode);
            log.warn("Payment failed for order: {} - Code: {} - Message: {}",
                    orderNumber, responseCode, errorMessage);
        }
    }

    /**
     * Lấy thông tin chi tiết kết quả thanh toán từ callback params
     */
    public Map<String, Object> getPaymentResult(Map<String, String> vnpParams) {
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String orderNumber = vnpParams.get("vnp_TxnRef");
        String transactionNo = vnpParams.get("vnp_TransactionNo");
        String amount = vnpParams.get("vnp_Amount");
        String payDate = vnpParams.get("vnp_PayDate");

        boolean success = "00".equals(responseCode);
        String message = vnPayService.getResponseMessage(responseCode);

        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("orderNumber", orderNumber != null ? orderNumber : "");
        result.put("transactionNo", transactionNo != null ? transactionNo : "");
        result.put("amount", amount != null ? Long.parseLong(amount) / 100 : 0);
        result.put("payDate", payDate != null ? payDate : "");
        result.put("message", message);
        result.put("responseCode", responseCode != null ? responseCode : "");

        return result;
    }
}