package com.datn.order_service.controller;

import com.datn.order_service.dto.request.CreatePaymentRequest;
import com.datn.order_service.dto.response.ApiResponse;
import com.datn.order_service.dto.response.PaymentResponse;
import com.datn.order_service.entity.Order;
import com.datn.order_service.exception.OrderNotFoundException;
import com.datn.order_service.repository.OrderRepository;
import com.datn.order_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("payments")
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final OrderRepository orderRepository;
    private final String webUrl;

    public PaymentController(PaymentService paymentService,
                             OrderRepository orderRepository,
                             @Value("${web.url}") String webUrl) {
        this.paymentService = paymentService;
        this.orderRepository = orderRepository;
        this.webUrl = webUrl;
    }

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            HttpServletRequest httpRequest) {

        request.setIpAddress("113.161.1.1");

        if (request.getPlatform() == null || request.getPlatform().isEmpty()) {
            request.setPlatform("web");
        }

        // Tạo payment URL
        PaymentResponse response = paymentService.createPayment(request);

        return ResponseEntity.ok(new ApiResponse<>(
                "Tạo thanh toán thành công!",
                true,
                response
        ));
    }
    @PostMapping("/re-pay/order/{orderId}/platform/{platform}")
    public ResponseEntity<ApiResponse<PaymentResponse>> rePayPayment(
            @PathVariable Long orderId,@PathVariable String platform,
            HttpServletRequest httpRequest) {
        Order order=orderRepository.findById(orderId)
                        .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy đơn hàng với mã: "+orderId));
        CreatePaymentRequest request = CreatePaymentRequest.builder()
                .orderNumber(order.getOrderNumber())
                .amount(order.getTotalAmount())
                .ipAddress(getClientIp(httpRequest))
                .platform(platform)
                .build();

        request.setIpAddress("127.0.0.1");

        if (request.getPlatform() == null || request.getPlatform().isEmpty()) {
            request.setPlatform("web");
        }

        // Tạo payment URL
        PaymentResponse response = paymentService.createPayment(request);

        return ResponseEntity.ok(new ApiResponse<>(
                "Tạo thanh toán thành công!",
                true,
                response
        ));
    }

    @GetMapping("/vnpay-callback")
    public RedirectView vnpayCallback(
            HttpServletRequest request,
            @RequestParam(value = "platform", defaultValue = "web") String platform) {

        log.info("=== Received VNPay callback for platform: {} ===", platform);

        Map<String, String> vnpParams = new HashMap<>();
        Enumeration<String> params = request.getParameterNames();

        while (params.hasMoreElements()) {
            String paramName = params.nextElement();
            String paramValue = request.getParameter(paramName);
            vnpParams.put(paramName, paramValue);
            log.debug("VNPay param: {} = {}", paramName, paramValue);
        }

        try {
            paymentService.handleVNPayCallback(vnpParams);
            Map<String, Object> result = paymentService.getPaymentResult(vnpParams);

            boolean success = (boolean) result.get("success");
            String orderNumber = (String) result.get("orderNumber");

            log.info("=== Payment callback processed - Order: {}, Success: {} ===", orderNumber, success);

            // Điều hướng theo platform
            if ("mobile".equalsIgnoreCase(platform)) {
                // Deep link cho mobile app
                if (success) {
                    return new RedirectView("myapp://payment/success?orderNumber=" + orderNumber);
                } else {
                    String message = (String) result.get("message");
                    return new RedirectView("myapp://payment/failure?orderNumber=" + orderNumber +
                            "&message=" + URLEncoder.encode(message, StandardCharsets.UTF_8));
                }
            } else {
                // URL cho web
                if (success) {
                    return new RedirectView(webUrl+ "/payment/success?orderNumber=" + orderNumber);
                } else {
                    String message = (String) result.get("message");
                    return new RedirectView(webUrl+ "/payment/failure?orderNumber=" + orderNumber +
                            "&message=" + URLEncoder.encode(message, StandardCharsets.UTF_8));
                }
            }

        } catch (Exception e) {
            log.error("Payment callback error", e);

            if ("mobile".equalsIgnoreCase(platform)) {
                return new RedirectView("myapp://payment/error");
            } else {
                return new RedirectView(webUrl+ "/payment/error");
            }
        }
    }

    /**
     * API: Kiểm tra trạng thái thanh toán của đơn hàng
     * GET /payments/check/{orderNumber}
     */
    @GetMapping("/check/{orderNumber}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkPaymentStatus(
            @PathVariable String orderNumber) {

        log.info("Checking payment status for order: {}", orderNumber);

        try {
            // Lấy thông tin order từ database
            Order order = orderRepository.findByOrderNumber(orderNumber)
                    .orElseThrow(() -> new OrderNotFoundException("Order not found: " + orderNumber));

            Map<String, Object> paymentInfo = new HashMap<>();
            paymentInfo.put("orderNumber", order.getOrderNumber());
            paymentInfo.put("paymentStatus", order.getPaymentStatus().name());
            paymentInfo.put("paymentMethod", order.getPaymentMethod());
            paymentInfo.put("totalAmount", order.getTotalAmount());
            paymentInfo.put("orderStatus", order.getStatus().getName());
            paymentInfo.put("createdAt", order.getCreatedAt());

            return ResponseEntity.ok(new ApiResponse<>(
                    "Lấy trạng thái thanh toán thành công!",
                    true,
                    paymentInfo
            ));

        } catch (OrderNotFoundException e) {
            log.error("Order not found: {}", orderNumber);
            return ResponseEntity.status(404).body(new ApiResponse<>(
                    e.getMessage(),
                    false,
                    null
            ));
        } catch (Exception e) {
            log.error("Error checking payment status", e);
            return ResponseEntity.status(500).body(new ApiResponse<>(
                    "Lỗi khi kiểm tra trạng thái thanh toán",
                    false,
                    null
            ));
        }
    }
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0];
        }
        return request.getRemoteAddr();
    }
}