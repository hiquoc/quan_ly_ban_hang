package com.datn.order_service.controller;

import com.datn.order_service.dto.request.*;
import com.datn.order_service.dto.response.ApiResponse;
import com.datn.order_service.dto.response.OrderDetailResponse;
import com.datn.order_service.dto.response.OrderResponse;
import com.datn.order_service.dto.response.PaymentResponse;
import com.datn.order_service.enums.PaymentStatus;
import com.datn.order_service.service.OrderService;
import com.datn.order_service.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    /**
     * Mua từ cart
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkoutFromCart(
            @RequestHeader("X-Owner-Id") Long customerId,
            @Valid @RequestBody CreateOrderRequest request,
            HttpServletRequest httpRequest) {
        request.setCustomerId(customerId);
        OrderDetailResponse orderResponse = orderService.createOrderFromCart(request);

        // Check if payment method is VNPay
        if ("VNPAY".equalsIgnoreCase(request.getPaymentMethod())) {
            // Create payment URL
            CreatePaymentRequest paymentRequest = CreatePaymentRequest.builder()
                    .orderNumber(orderResponse.getOrderNumber())
                    .amount(orderResponse.getTotalAmount())
                    .ipAddress(getClientIp(httpRequest))
                    .build();

            PaymentResponse paymentResponse = paymentService.createPayment(paymentRequest);

            // Return both order and payment info
            Map<String, Object> response = Map.of(
                    "order", orderResponse,
                    "payment", paymentResponse,
                    "requiresPayment", true
            );

            return ResponseEntity.ok(new ApiResponse<>(
                    "Đặt hàng thành công! Vui lòng thanh toán.",
                    true,
                    response
            ));
        }

        // COD - No payment required
        Map<String, Object> response = Map.of(
                "order", orderResponse,
                "requiresPayment", false
        );

        return ResponseEntity.ok(new ApiResponse<>(
                "Đặt hàng thành công!",
                true,
                response
        ));
    }

    /**
     * Mua ngay
     */
    @PostMapping("/buy-now")
    public ResponseEntity<ApiResponse<Map<String, Object>>> buyNow(
            @RequestHeader("X-Owner-Id") Long customerId,
            @Valid @RequestBody BuyNowRequest request,
            HttpServletRequest httpRequest) {

        request.setCustomerId(customerId);
        OrderDetailResponse orderResponse = orderService.buyNow(request);

        // Check if payment method is VNPay
        if ("VNPAY".equalsIgnoreCase(request.getPaymentMethod())) {
            CreatePaymentRequest paymentRequest = CreatePaymentRequest.builder()
                    .orderNumber(orderResponse.getOrderNumber())
                    .amount(orderResponse.getTotalAmount())
                    .ipAddress(getClientIp(httpRequest))
                    .build();

            PaymentResponse paymentResponse = paymentService.createPayment(paymentRequest);

            Map<String, Object> response = Map.of(
                    "order", orderResponse,
                    "payment", paymentResponse,
                    "requiresPayment", true
            );

            return ResponseEntity.ok(new ApiResponse<>(
                    "Mua hàng thành công! Vui lòng thanh toán.",
                    true,
                    response
            ));
        }

        // COD
        Map<String, Object> response = Map.of(
                "order", orderResponse,
                "requiresPayment", false
        );

        return ResponseEntity.ok(new ApiResponse<>(
                "Mua hàng thành công!",
                true,
                response
        ));
    }

    /**
     * Tra theo mã đơn hàng
     */
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/number/{orderNumber}")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getOrderByNumber(
            @PathVariable String orderNumber) {
        OrderDetailResponse response = orderService.getOrderByNumber(orderNumber);
        return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin đơn hàng thành công!", true, response));
    }

    /**
     * Lấy danh sách đơn hàng của khách hàng
     */
    @GetMapping("/customer")
    public ResponseEntity<ApiResponse<Page<OrderDetailResponse>>> getCustomerOrders(
            @RequestHeader("X-Owner-Id") Long customerId,
            @RequestParam(required = false) String statusName,
            Pageable pageable) {
        Page<OrderDetailResponse> response = orderService.getCustomerOrders(customerId,statusName, pageable);
        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách đơn hàng thành công!", true, response));
    }

    /**
     * Lấy danh sách đơn hàng toàn bộ khách hàng (Admin)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getAllOrders(Pageable pageable) {
        Page<OrderResponse> response = orderService.getAllOrders(pageable);
        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách đơn hàng thành công!", true, response));
    }

    /**
     * Lọc theo trạng thái
     */
    @GetMapping("/status/{statusId}")
    public ResponseEntity<ApiResponse<Page<OrderResponse>>> getOrdersByStatus(
            @PathVariable Long statusId,
            Pageable pageable) {
        Page<OrderResponse> response = orderService.getOrdersByStatus(statusId, pageable);
        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách đơn hàng thành công!", true, response));
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @GetMapping("/secure/orders")
    public ResponseEntity<?> getOrdersAdvanced(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        try {
            LocalDate start = null;
            LocalDate end = null;
            if (startDate != null && !startDate.isBlank()) {
                try {
                    start = LocalDate.parse(startDate);
                } catch (DateTimeParseException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu không hợp lệ!");
                }
            }
            if (endDate != null && !endDate.isBlank()) {
                try {
                    end = LocalDate.parse(endDate);
                } catch (DateTimeParseException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày kết thúc không hợp lệ!");
                }
            }
            Page<OrderResponse> orders = orderService.getOrdersAdvanced(page, size, status,keyword, start, end);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu đơn hàng thành công!", true, orders));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(new ApiResponse<>(ex.getReason(), false, null));
        }
    }
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @RequestHeader("X-Owner-Id") Long staffId) {
        OrderResponse response = orderService.updateOrderStatus(orderId, request.getStatusId(),staffId);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái đơn hàng thành công!", true, response));
    }

    @PatchMapping("/{orderId}/payment-status")
    public ResponseEntity<ApiResponse<OrderResponse>> updatePaymentStatus(
            @PathVariable Long orderId,
            @RequestParam PaymentStatus paymentStatus) {
        OrderResponse response = orderService.updatePaymentStatus(orderId, paymentStatus);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái thanh toán thành công!", true, response));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long orderId,
            @RequestHeader("X-Owner-Id") Long customerId,
            @RequestHeader("X-User-Role") String role,
            @Valid @RequestBody CancelOrderRequest request) {
        OrderResponse response = orderService.cancelOrder(orderId,customerId,role, request.getReason());
        return ResponseEntity.ok(new ApiResponse<>("Hủy đơn hàng thành công!", true, response));
    }

    @GetMapping("/customer/statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomerOrderStats(
            @RequestHeader("X-Owner-Id") Long customerId) {
        Map<String, Object> stats = orderService.getCustomerOrderStats(customerId);
        return ResponseEntity.ok(new ApiResponse<>("Lấy thống kê đơn hàng thành công!", true, stats));
    }

    //Nhan yeu cau cap nhat trang thai thanh shipped tu transaction service
    @PostMapping("/internal/order/{orderNumber}/shipped")
    public ResponseEntity<ApiResponse<Void>> updateOrderStatusToShipped(
            @PathVariable String orderNumber,
            @Valid @RequestBody UpdateOrderStatusFromInvRequest request) {
        orderService.updateOrderStatusFromInv(orderNumber,request);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái đơn hàng thành công!", true, null));
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