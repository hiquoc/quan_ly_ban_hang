package com.datn.order_service.controller;

import com.datn.order_service.dto.request.CreatePaymentRequest;
import com.datn.order_service.dto.response.ApiResponse;
import com.datn.order_service.dto.response.PaymentResponse;
import com.datn.order_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Create payment URL for order
     */
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            HttpServletRequest httpRequest) {

        // Get client IP
        String ipAddress = getClientIp(httpRequest);
        request.setIpAddress(ipAddress);

        PaymentResponse response = paymentService.createPayment(request);
        return ResponseEntity.ok(new ApiResponse<>("Tạo thanh toán thành công!", true, response));
    }

    /**
     * VNPay callback endpoint
     */
    @GetMapping("/vnpay-callback")
    public ResponseEntity<String> vnpayCallback(HttpServletRequest request) {
        log.info("Received VNPay callback");

        Map<String, String> vnpParams = new HashMap<>();
        Enumeration<String> params = request.getParameterNames();

        while (params.hasMoreElements()) {
            String paramName = params.nextElement();
            String paramValue = request.getParameter(paramName);
            vnpParams.put(paramName, paramValue);
        }

        try {
            paymentService.handleVNPayCallback(vnpParams);

            // Redirect to success page
            return ResponseEntity.ok("Payment processed successfully");

        } catch (Exception e) {
            log.error("Error processing VNPay callback", e);
            return ResponseEntity.badRequest().body("Payment processing failed");
        }
    }

    /**
     * Get client IP address
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0];
        }
        return request.getRemoteAddr();
    }
}