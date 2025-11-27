package com.datn.order_service.controller;

import com.datn.order_service.client.AuthServiceClient;
import com.datn.order_service.dto.PageCacheWrapper;
import com.datn.order_service.dto.request.*;
import com.datn.order_service.dto.response.*;
import com.datn.order_service.dto.response.dashboard.OrderDashboardResponse;
import com.datn.order_service.enums.PaymentStatus;
import com.datn.order_service.service.OrderDashboardService;
import com.datn.order_service.service.OrderService;
import com.datn.order_service.service.PaymentService;
import com.datn.order_service.service.cloud.CloudinaryService;
import feign.FeignException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.time.*;
import java.time.format.DateTimeParseException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;
    private final OrderDashboardService dashboardService;
    private final AuthServiceClient authServiceClient;
    /**
     * Mua từ cart
     */
    @PreAuthorize("hasRole('CUSTOMER')")
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkoutFromCart(
            @RequestHeader("X-Account-Id") Long accountId,
            @RequestHeader("X-Owner-Id") Long customerId,
            @Valid @RequestBody CreateOrderRequest request,
            HttpServletRequest httpRequest) {
//        try {
//            Boolean verified = authServiceClient.checkAccountIsVerified(accountId).getBody();
//            if (verified != null && !verified) {
//                return ResponseEntity.status(HttpStatus.FORBIDDEN)
//                        .body(new ApiResponse<>( "Bạn chưa xác thực tài khoản!",false,null));
//            }
//        } catch (FeignException e) {
//            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
//                    .body(new ApiResponse<>( "Không thể kiểm tra trạng thái xác thực của tài khoản!",false,null));
//        }

        request.setCustomerId(customerId);
        OrderDetailResponse orderResponse = orderService.createOrderFromCart(request);

        // Check if payment method is VNPay
        if ("VNPAY".equalsIgnoreCase(request.getPaymentMethod())) {
            // Create payment URL
            CreatePaymentRequest paymentRequest = CreatePaymentRequest.builder()
                    .orderNumber(orderResponse.getOrderNumber())
                    .amount(orderResponse.getTotalAmount())
                    .ipAddress(getClientIp(httpRequest))
                    .platform(request.getPlatform())
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
                    .platform(request.getPlatform())
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
            @PathVariable String orderNumber,
            @RequestHeader("X-User-Role") String role) {
        OrderDetailResponse response = orderService.getOrderByNumber(orderNumber,Objects.equals(role, "ADMIN") || Objects.equals(role, "MANAGER"));
        return ResponseEntity.ok(new ApiResponse<>("Lấy thông tin đơn hàng thành công!", true, response));
    }

    /**
     * Lấy danh sách đơn hàng của khách hàng
     */
    @GetMapping("/customer")
    public ResponseEntity<ApiResponse<PageCacheWrapper<OrderDetailResponse>>> getCustomerOrders(
            @RequestHeader("X-Owner-Id") Long customerId,
            @RequestParam(required = false) String statusName,
            Pageable pageable) {
        PageCacheWrapper<OrderDetailResponse> response = orderService.getCustomerOrders(customerId,statusName, pageable);
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
            @RequestParam(required = false) String endDate,
            @RequestHeader("X-User-Role") String role,
            @RequestParam(required = false) Long warehouseId) {
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
            Page<OrderResponse> orders = orderService.getOrdersAdvanced(page, size, status,keyword,
                    start, end, Objects.equals(role, "ADMIN") || Objects.equals(role, "MANAGER"),warehouseId);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu đơn hàng thành công!", true, orders));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(new ApiResponse<>(ex.getReason(), false, null));
        }
    }

    @GetMapping("/internal/recommend")
    public ResponseEntity<?> getOrdersDetailsAdvanced(
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
            Page<OrderDetailResponse> orders = orderService.getOrdersDetailsAdvanced(page, size, status,keyword,
                    start, end);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu đơn hàng thành công!", true, orders));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(new ApiResponse<>(ex.getReason(), false, null));
        }
    }

    @GetMapping("/secure/recommend")
    public ResponseEntity<?> getOrdersDetailsAdvancedSecure(
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
            Page<OrderDetailResponse> orders = orderService.getOrdersDetailsAdvanced(page, size, status,keyword,
                    start, end);
            return ResponseEntity.ok(new ApiResponse<>("Lấy dữ liệu đơn hàng thành công!", true, orders));
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(new ApiResponse<>(ex.getReason(), false, null));
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF') or hasRole('SHIPPER')")
    @PatchMapping("/{orderId}/status")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader("X-Owner-Id") Long staffId,
            @RequestHeader("X-Warehouse-Id") Long staffWarehouseId) {
        OrderResponse response = orderService.updateOrderStatus(orderId, request.getStatusId(), request.getNotes(),
                role,staffId, Objects.equals(role, "ADMIN") || Objects.equals(role, "MANAGER") ?-1:staffWarehouseId);
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

//    @PostMapping("/return")
//    public ResponseEntity<ApiResponse<ReturnOrderResponse>> createReturnOrder(
//            @Valid @RequestPart("return") ReturnOrderRequest request,
//            @RequestPart(value="images",required = false) List<MultipartFile> images,
//            @RequestHeader("X-Owner-Id") Long customerId,
//            @RequestHeader("X-User-Role") String role){
//        if(customerId == null || !Objects.equals(role, "CUSTOMER"))
//            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không được phép tạo yêu cầu trả hàng!");
//        request.setCustomerId(customerId);
//        return ResponseEntity.ok(new ApiResponse<>("Tạo yêu cầu trả hàng thành công!", true, orderService.createReturnOrder(request,images)));
//    }
//
//    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER') or hasRole('STAFF')")
//    @GetMapping("/return")
//    public ResponseEntity<ApiResponse<List<ReturnOrderResponse>>> getAllReturnOrder(){
//        return ResponseEntity.ok(new ApiResponse<>("Lấy danh sách yêu cầu trả hàng thành công!", true, orderService.getAllReturnOrders()));
//    }
    //Nhan yeu cau cap nhat trang thai thanh shipped tu transaction service va delivery service
    @PostMapping("/internal/order/status")
    public ResponseEntity<ApiResponse<Void>> updateOrderStatusInternal(
            @Valid @RequestBody UpdateOrderStatusFromInvRequest request) {
        orderService.updateOrderStatusFromInternal(request);
        return ResponseEntity.ok(new ApiResponse<>("Cập nhật trạng thái đơn hàng thành công!", true, null));
    }
    @GetMapping("/internal/order/{orderId}")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getOrder(
            @PathVariable Long orderId) {
        OrderDetailResponse response = orderService.getOrder(orderId);
        return ResponseEntity.ok(new ApiResponse<>("Lấy đơn hàng thành công!", true, response));
    }

    @GetMapping("/secure/dashboard")
    public ResponseEntity<OrderDashboardResponse> getDashboard(
            @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam("end") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        if (start == null || end == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start and end dates are required");
        }

        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime   = end.atTime(LocalTime.MAX);

        ZoneOffset offset = ZoneId.systemDefault().getRules().getOffset(startDateTime);
        OffsetDateTime fromOffset = startDateTime.atOffset(offset);
        OffsetDateTime toOffset   = endDateTime.atOffset(offset);

        OrderDashboardResponse response = dashboardService.getDashboard(fromOffset, toOffset);
        return ResponseEntity.ok(response);
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