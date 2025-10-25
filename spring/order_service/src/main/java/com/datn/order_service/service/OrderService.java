package com.datn.order_service.service;

import com.datn.order_service.client.CartServiceClient;
import com.datn.order_service.client.InventoryServiceClient;
import com.datn.order_service.client.ProductServiceClient;
import com.datn.order_service.client.PromotionServiceClient;
import com.datn.order_service.client.dto.VariantDTO;
import com.datn.order_service.client.dto.request.OrderTransactionRequest;
import com.datn.order_service.client.dto.request.ReleaseStockRequest;
import com.datn.order_service.client.dto.request.ReserveStockRequest;
import com.datn.order_service.client.dto.request.ValidatePromotionRequest;
import com.datn.order_service.client.dto.response.PromotionValidationResponse;
import com.datn.order_service.dto.request.*;
import com.datn.order_service.dto.response.ApiResponse;
import com.datn.order_service.dto.response.OrderDetailResponse;
import com.datn.order_service.dto.response.OrderItemResponse;
import com.datn.order_service.dto.response.OrderResponse;
import com.datn.order_service.entity.Order;
import com.datn.order_service.entity.OrderItem;
import com.datn.order_service.entity.OrderStatus;
import com.datn.order_service.enums.PaymentStatus;
import com.datn.order_service.exception.OrderNotFoundException;
import com.datn.order_service.repository.OrderItemRepository;
import com.datn.order_service.repository.OrderRepository;
import com.datn.order_service.repository.OrderStatusRepository;
import feign.FeignException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusRepository orderStatusRepository;

    private final InventoryServiceClient inventoryServiceClient;
    private final PromotionServiceClient promotionServiceClient;
    private final ProductServiceClient productServiceClient;
    private final CartServiceClient cartServiceClient;

    /**
     * Create order from cart (checkout all or selected items)
     */
    @Transactional
    public OrderDetailResponse createOrderFromCart(CreateOrderRequest request) {
        log.info("Creating order from cart for customer: {} (clearCart={})",
                request.getCustomerId(), request.getClearCart());

        OrderDetailResponse orderResponse = createOrderInternal(request);

        // Handle cart based on clearCart flag
        handleCartAfterCheckout(request.getCustomerId(), request.getClearCart(),
                extractVariantIds(request.getItems()));

        return orderResponse;
    }

    /**
     * Buy Now - Create order directly without cart
     */
    @Transactional
    public OrderDetailResponse buyNow(BuyNowRequest request) {
        log.info("Buy Now for customer: {} - VariantId: {}",
                request.getCustomerId(), request.getVariantId());

        CreateOrderRequest orderRequest = CreateOrderRequest.builder()
                .customerId(request.getCustomerId())
                .items(Collections.singletonList(
                        OrderItemRequest.builder()
                                .variantId(request.getVariantId())
                                .quantity(request.getQuantity())
                                .build()
                ))
                .shippingName(request.getShippingName())
                .shippingAddress(request.getShippingAddress())
                .shippingPhone(request.getShippingPhone())
                .paymentMethod(request.getPaymentMethod())
                .promotionCode(request.getPromotionCode())
                .notes(request.getNotes())
                .build();

        // Create order without touching cart
        OrderDetailResponse orderResponse = createOrderInternal(orderRequest);

        log.info("Buy Now order created successfully - OrderNumber: {}",
                orderResponse.getOrderNumber());

        return orderResponse;
    }

    @Transactional
    private OrderDetailResponse createOrderInternal(CreateOrderRequest request) {
        // 1. Get initial order status (PENDING)
        OrderStatus pendingStatus = orderStatusRepository.findByName("PENDING")
                .orElseThrow(() -> new RuntimeException("Pending status not found"));

        // 2. Calculate order amounts
        BigDecimal subtotal = calculateSubtotal(request.getItems());
        BigDecimal discountAmount = BigDecimal.ZERO;

        // 3. Apply promotion if provided
        Long promotionId = null;
        if (request.getPromotionCode() != null && !request.getPromotionCode().isEmpty()) {
            ValidatePromotionRequest promoRequest = ValidatePromotionRequest.builder()
                    .code(request.getPromotionCode())
                    .customerId(request.getCustomerId())
                    .orderAmount(subtotal)
                    .productIds(request.getItems().stream()
                            .map(OrderItemRequest::getProductId)
                            .collect(Collectors.toList()))
                    .build();

            try {
                ApiResponse<PromotionValidationResponse> apiResponse =
                        promotionServiceClient.validatePromotion(promoRequest);

                log.info("Promotion API response - success: {}, message: {}",
                        apiResponse.isSuccess(), apiResponse.getMessage());

                if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                    PromotionValidationResponse promoResponse = apiResponse.getData();

                    if (Boolean.TRUE.equals(promoResponse.getIsValid())) {
                        discountAmount = promoResponse.getDiscountAmount();
                        promotionId = promoResponse.getPromotion().getId();
                        log.info("Promotion applied successfully - Code: {}, Discount: {}",
                                request.getPromotionCode(), discountAmount);
                    } else {
                        log.warn("Promotion validation failed: {}", promoResponse.getMessage());
                    }
                } else {
                    log.warn("Promotion API call returned unsuccessful: {}", apiResponse.getMessage());
                }
            } catch (FeignException e) {
                log.error("Feign error calling promotion service: Status={}, Message={}",
                        e.status(), e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected error calling promotion service", e);
            }
        }

        // phi giao hang+phat sinh
        BigDecimal fee = BigDecimal.valueOf(20000);
        BigDecimal totalAmount = subtotal.subtract(discountAmount).add(fee);

        // 4. Create order
        Order order = Order.builder()
                .orderNumber("TEMP") // Will be updated after save
                .customerId(request.getCustomerId())
                .subtotal(subtotal)
                .fee(fee)
                .discountAmount(discountAmount)
                .totalAmount(totalAmount)
                .promotionCode(request.getPromotionCode())
                .status(pendingStatus)
                .paymentStatus(PaymentStatus.PENDING)
                .shippingName(request.getShippingName())
                .shippingAddress(request.getShippingAddress())
                .shippingPhone(request.getShippingPhone())
                .paymentMethod(request.getPaymentMethod())
                .orderDate(LocalDateTime.now())
                .notes(request.getNotes())
                .build();

        order = orderRepository.save(order);

        // 5. Generate and update orderNumber with ID
        String orderNumber = generateOrderNumber(order.getId());
        order.setOrderNumber(orderNumber);
        order = orderRepository.save(order);

        log.info("Order created with number: {}", orderNumber);

        // 6. Create order items and reserve stock
        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            try {
                if (itemReq.getVariantId() == null) {
                    log.error("Variant ID is required for item in order creation");
                    throw new RuntimeException("Variant ID is required for all items in the order.");
                }

                // Get variant information from Product Service
                VariantDTO variant = productServiceClient.getVariant(itemReq.getVariantId()).getBody();

                // Validate variant availability
                if (variant == null) {
                    throw new RuntimeException("Variant not found with ID: " + itemReq.getVariantId());
                }
                if (!variant.isActive() || variant.getStatus().equals("OUT_OF_STOCK")) {
                    log.error("Variant {} is not available for purchase", itemReq.getVariantId());
                    throw new RuntimeException("Variant is not available: " + itemReq.getVariantId());
                }

                BigDecimal unitPrice = variant.getSellingPrice();

                if (unitPrice == null) {
                    log.error("Selling price is null for variant: {}", itemReq.getVariantId());
                    throw new RuntimeException("Selling price not found for variant ID: " + itemReq.getVariantId());
                }

                BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

                OrderItem orderItem = OrderItem.builder()
                        .order(order)
                        .variantId(itemReq.getVariantId())
                        .quantity(itemReq.getQuantity())
                        .unitPrice(unitPrice)
                        .totalPrice(totalPrice)
                        .productSnapshot(createVariantSnapshot(variant))
                        .build();

                orderItems.add(orderItem);

                // Reserve stock
                ReserveStockRequest stockRequest = ReserveStockRequest.builder()
                        .variantId(itemReq.getVariantId())
                        .quantity(itemReq.getQuantity())
                        .orderNumber(order.getOrderNumber())
                        .build();

                try {
                    inventoryServiceClient.reserveStock(stockRequest);
                    log.info("Stock reserved - ProductId: {}, VariantId: {}, Quantity: {}",
                            variant.getProductId(), itemReq.getVariantId(), itemReq.getQuantity());
                } catch (FeignException e) {
                    log.error("Failed to reserve stock for variant {}: Status={}",
                            itemReq.getVariantId(), e.status());
                    throw new RuntimeException("Sản phẩm " + variant.getName() + " không đủ để hoàn tất đơn đặt hàng!");
                } catch (Exception e) {
                    log.error("Unexpected error reserving stock for variant: {}", itemReq.getVariantId(), e);
                    throw new RuntimeException("Failed to reserve stock for variant ID: " + itemReq.getVariantId());
                }

            } catch (FeignException e) {
                log.error("Failed to get variant info for variant {}: Status={}",
                        itemReq.getVariantId(), e.status());
                throw new RuntimeException("Variant not found with ID: " + itemReq.getVariantId());
            }
        }

        orderItemRepository.saveAll(orderItems);
        log.info("Saved {} order items", orderItems.size());

        // 7. Record promotion usage if applicable
        if (promotionId != null && discountAmount.compareTo(BigDecimal.ZERO) > 0) {
            try {
                ApiResponse<Void> usageResponse = promotionServiceClient.recordUsage(
                        promotionId,
                        order.getId(),
                        request.getCustomerId()
                );

                if (usageResponse.isSuccess()) {
                    log.info("Promotion usage recorded successfully for promotion ID: {}", promotionId);
                } else {
                    log.warn("Failed to record promotion usage: {}", usageResponse.getMessage());
                }
            } catch (FeignException e) {
                log.error("Feign error recording promotion usage: Status={}", e.status());
            } catch (Exception e) {
                log.error("Failed to record promotion usage", e);
            }
        }

        log.info("Order created successfully - OrderNumber: {}, TotalAmount: {}",
                orderNumber, totalAmount);

        return mapToDetailResponse(order, orderItems);
    }

    private void handleCartAfterCheckout(Long customerId, Boolean clearCart, Set<Long> variantIds) {
        System.out.println(variantIds);
        try {
            if (Boolean.TRUE.equals(clearCart)) {
                // Clear entire cart
                ApiResponse<Void> cartResponse = cartServiceClient.clearCart(customerId);
                if (cartResponse.isSuccess()) {
                    log.info("Cart cleared completely for customer: {}", customerId);
                } else {
                    log.warn("Failed to clear cart: {}", cartResponse.getMessage());
                }
            } else {
                // Remove only selected items
                System.out.println(customerId);
                for (Long variantId : variantIds) {
                    try {
                        ApiResponse<Void> removeResponse =
                                cartServiceClient.removeCartItem(customerId, variantId);
                        if (removeResponse.isSuccess()) {
                            log.info("Removed variant {} from cart for customer: {}",
                                    variantId, customerId);
                        }
                    } catch (Exception e) {
                        log.error("Failed to remove variant {} from cart", variantId, e);
                    }
                }
                log.info("Removed {} selected items from cart", variantIds.size());
            }
        } catch (FeignException e) {
            log.error("Feign error handling cart: Status={}", e.status());
        } catch (Exception e) {
            log.error("Failed to handle cart after checkout", e);
        }
    }

    private Set<Long> extractVariantIds(List<OrderItemRequest> items) {
        return items.stream()
                .map(OrderItemRequest::getVariantId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public OrderDetailResponse getOrderByNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with number: " + orderNumber));

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        return mapToDetailResponse(order, items);
    }

    public Page<OrderDetailResponse> getCustomerOrders(Long customerId, String statusName, Pageable pageable) {
        log.info("Getting orders for customer: {}", customerId);

        Page<Order> orders = orderRepository.findByCustomerIdAndStatus(customerId, statusName, pageable);

        return orders.map(order -> {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            return mapToDetailResponse(order, items);
        });
    }

    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        return orderRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    public Page<OrderResponse> getOrdersByStatus(Long statusId, Pageable pageable) {
        return orderRepository.findByStatusId(statusId, pageable)
                .map(this::mapToResponse);
    }

    @PersistenceContext
    private EntityManager em;
    public Page<OrderResponse> getOrdersAdvanced(
            Integer page,
            Integer size,
            String status,
            String keyword,
            LocalDate fromDate,
            LocalDate toDate) {

        Pageable pageable = (page == null || size == null)
                ? Pageable.unpaged()
                : PageRequest.of(page, size, Sort.by("orderDate").descending());

        LocalDateTime startDateTime = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime endDateTime = toDate != null ? toDate.plusDays(1).atStartOfDay() : null;

        Long customerId = null;
        if (keyword != null && keyword.toUpperCase().startsWith("CUS")) {
            try {
                customerId = Long.parseLong(keyword.substring(3));
                keyword = null; // avoid matching orderNumber with "CUS..."
            } catch (NumberFormatException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer ID không hợp lệ!");
            }
        }

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Order> cq = cb.createQuery(Order.class);
        Root<Order> root = cq.from(Order.class);

        List<Predicate> predicates = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            predicates.add(cb.equal(root.get("status").get("name"), status));
        }

        if (startDateTime != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("orderDate"), startDateTime));
        }
        if (endDateTime != null) {
            predicates.add(cb.lessThan(root.get("orderDate"), endDateTime));
        }

        if (keyword != null && !keyword.isBlank() || customerId != null) {
            List<Predicate> orPredicates = new ArrayList<>();
            if (keyword != null && !keyword.isBlank()) {
                orPredicates.add(cb.like(root.get("orderNumber"), "%" + keyword + "%"));
            }
            if (customerId != null) {
                orPredicates.add(cb.equal(root.get("customerId"), customerId));
            }
            predicates.add(cb.or(orPredicates.toArray(new Predicate[0])));
        }

        cq.where(cb.and(predicates.toArray(new Predicate[0])));
        cq.orderBy(cb.desc(root.get("orderDate")));

        TypedQuery<Order> query = em.createQuery(cq);

        if (pageable.isPaged()) {
            query.setFirstResult((int) pageable.getOffset());
            query.setMaxResults(pageable.getPageSize());
        }

        List<Order> results = query.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Order> countRoot = countQuery.from(Order.class);
        countQuery.select(cb.count(countRoot));
        List<Predicate> countPredicates = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            countPredicates.add(cb.equal(countRoot.get("status").get("name"), status));
        }
        if (startDateTime != null) {
            countPredicates.add(cb.greaterThanOrEqualTo(countRoot.get("orderDate"), startDateTime));
        }
        if (endDateTime != null) {
            countPredicates.add(cb.lessThan(countRoot.get("orderDate"), endDateTime));
        }
        if (keyword != null && !keyword.isBlank() || customerId != null) {
            List<Predicate> orPredicatesCount = new ArrayList<>();
            if (keyword != null && !keyword.isBlank()) {
                orPredicatesCount.add(cb.like(countRoot.get("orderNumber"), "%" + keyword + "%"));
            }
            if (customerId != null) {
                orPredicatesCount.add(cb.equal(countRoot.get("customerId"), customerId));
            }
            countPredicates.add(cb.or(orPredicatesCount.toArray(new Predicate[0])));
        }
        countQuery.where(cb.and(countPredicates.toArray(new Predicate[0])));
        Long total = em.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(
                results.stream().map(this::mapToResponse).toList(),
                pageable,
                total
        );
    }


    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, Long statusId,Long staffId) {
        log.info("Updating order {} to status {}", orderId, statusId);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with ID: " + orderId));

        OrderStatus newStatus = orderStatusRepository.findById(statusId)
                .orElseThrow(() -> new RuntimeException("Status not found with ID: " + statusId));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);

        handleStatusChange(order,staffId, oldStatus, newStatus);
        order = orderRepository.save(order);


        log.info("Order status updated successfully - OrderId: {}, NewStatus: {}",
                orderId, newStatus.getName());

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse updatePaymentStatus(Long orderId, PaymentStatus paymentStatus) {
        log.info("Updating payment status for order {} to {}", orderId, paymentStatus);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with ID: " + orderId));

        order.setPaymentStatus(paymentStatus);
        order = orderRepository.save(order);

        if (paymentStatus == PaymentStatus.PAID) {
            OrderStatus confirmedStatus = orderStatusRepository.findByName("CONFIRMED")
                    .orElse(null);
            if (confirmedStatus != null && !order.getStatus().getName().equals("CONFIRMED")) {
                order.setStatus(confirmedStatus);
                order = orderRepository.save(order);
                log.info("Order status updated to CONFIRMED after payment");
            }
        }

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long customerId, String role, String reason) {
        log.info("Cancelling order {} with reason: {}", orderId, reason);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with ID: " + orderId));

        if (!Objects.equals(customerId, order.getCustomerId()) && Objects.equals(role, "CUSTOMER"))
            throw new IllegalStateException("You don't have the permission to cancel this order!");

        String currentStatus = order.getStatus().getName();
        if ("DELIVERED".equals(currentStatus) || "CANCELLED".equals(currentStatus)) {
            throw new IllegalStateException("Order cannot be cancelled in current status: " + currentStatus);
        }

        OrderStatus cancelledStatus = orderStatusRepository.findByName("CANCELLED")
                .orElseThrow(() -> new RuntimeException("Cancelled status not found"));

        order.setStatus(cancelledStatus);
        order.setPaymentStatus(PaymentStatus.CANCELLED);
        order.setCancelledDate(LocalDateTime.now());

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        String formattedDateTime = LocalDateTime.now().format(formatter);

        String updatedNotes = (order.getNotes() != null ? order.getNotes() : "")
                + "Lý do hủy: " + reason
                + "\nHủy vào lúc: " + formattedDateTime;
        order.setNotes(updatedNotes);

        // Release reserved stock
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        for (OrderItem item : items) {
            ReleaseStockRequest releaseRequest = ReleaseStockRequest.builder()
                    .reason("ORDER_CANCELLED")
                    .build();

            try {
                inventoryServiceClient.releaseStock(order.getOrderNumber(), releaseRequest);
                log.info("Stock released for variant: {} (Quantity: {})",
                        item.getVariantId(), item.getQuantity());
            } catch (FeignException e) {
                log.error("Feign error releasing stock: Status={}", e.status());
            } catch (Exception e) {
                log.error("Failed to release stock for variant: {}", item.getVariantId(), e);
            }
        }

        order = orderRepository.save(order);

        log.info("Order cancelled successfully - OrderId: {}", orderId);

        return mapToResponse(order);
    }

    public Map<String, Object> getCustomerOrderStats(Long customerId) {
        log.info("Getting order statistics for customer: {}", customerId);

        Long totalOrders = orderRepository.countByCustomerId(customerId);
        BigDecimal totalSpent = orderRepository.sumTotalAmountByCustomerId(customerId);

        if (totalSpent == null) {
            totalSpent = BigDecimal.ZERO;
        }

        BigDecimal averageOrderValue = totalOrders > 0
                ? totalSpent.divide(BigDecimal.valueOf(totalOrders), 2, BigDecimal.ROUND_HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> stats = new HashMap<>();
        stats.put("customerId", customerId);
        stats.put("totalOrders", totalOrders);
        stats.put("totalSpent", totalSpent);
        stats.put("averageOrderValue", averageOrderValue);

        return stats;
    }

    // ==================== HELPER METHODS ====================
    private BigDecimal calculateSubtotal(List<OrderItemRequest> items) {
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequest item : items) {
            try {
                if (item.getVariantId() == null) {
                    throw new RuntimeException("Variant ID is required for all items");
                }

                VariantDTO variant = productServiceClient.getVariant(item.getVariantId()).getBody();
                if (variant == null || variant.getSellingPrice() == null) {
                    log.error("Selling price is not available for variant ID: {}", item.getVariantId());
                    throw new RuntimeException("Selling price is not available for variant ID: " + item.getVariantId());
                }

                BigDecimal itemTotal = variant.getSellingPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                subtotal = subtotal.add(itemTotal);

            } catch (FeignException e) {
                log.error("Failed to get variant price for variant {}: Status={}",
                        item.getVariantId(), e.status());
                throw new RuntimeException("Failed to calculate order subtotal. Variant not found with ID: " + item.getVariantId());
            }
        }

        return subtotal;
    }

    private String generateOrderNumber(Long orderId) {
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return String.format("DATN-%s-%d", date, orderId);
    }

    private Map<String, Object> createVariantSnapshot(VariantDTO variant) {
        Map<String, Object> snapshot = new HashMap<>();
        System.out.println(12345);

        System.out.println(variant);

        if (variant != null) {
            snapshot.put("variantId", variant.getId());
            snapshot.put("productId", variant.getProductId());
            snapshot.put("name", variant.getName());
            snapshot.put("slug", variant.getProductSlug());
            snapshot.put("sku", variant.getSku());
            snapshot.put("sellingPrice", variant.getSellingPrice());
            snapshot.put("importPrice", variant.getImportPrice());
            snapshot.put("discountPercent", variant.getDiscountPercent());
            snapshot.put("attributes", variant.getAttributes());
            snapshot.put("imageUrls", variant.getImageUrls() != null ?
                    variant.getImageUrls() : Collections.emptyList());
            snapshot.put("isActive", variant.isActive());
            snapshot.put("status", variant.getStatus());
        } else {
            snapshot.put("name", "Unknown Variant");
        }

        snapshot.put("snapshotDate", LocalDateTime.now());
        return snapshot;
    }

    private void handleStatusChange(Order order,Long staffId, OrderStatus oldStatus, OrderStatus newStatus) {
        String newStatusName = newStatus.getName();

        switch (newStatusName) {
            case "CONFIRMED":
                log.info("Order confirmed - OrderId: {}", order.getId());
                break;

            case "PROCESSING":
                log.info("Order processing started - OrderId: {}", order.getId());

                List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
                List<OrderItemTransactionRequest> stockItemRequestList = items.stream()
                        .map(item -> OrderItemTransactionRequest.builder()
                                .variantId(item.getVariantId())
                                .pricePerItem(item.getUnitPrice())
                                .quantity(item.getQuantity())
                                .build())
                        .toList();

                OrderTransactionRequest orderRequest = OrderTransactionRequest.builder()
                        .orderNumber(order.getOrderNumber())
                        .orderItems(stockItemRequestList)
                        .staffId(staffId)
                        .note("ORDER_PROCESSING")
                        .build();

                try {
                    inventoryServiceClient.createOrderTransaction(orderRequest);
                    log.info("Created order transaction for OrderNumber: {}", order.getOrderNumber());
                } catch (Exception e) {
                    log.error("Failed to create order transaction for OrderNumber: {}", order.getOrderNumber(), e);
                    throw new RuntimeException("Cannot process inventory for OrderNumber: " + order.getOrderNumber(), e);
                }
                break;

            case "DELIVERED":
                order.setDeliveredDate(LocalDateTime.now());
                log.info("Order delivered - OrderId: {}", order.getId());
                // Auto-update payment for COD
                if ("COD".equalsIgnoreCase(order.getPaymentMethod()) &&
                        order.getPaymentStatus() == PaymentStatus.PENDING) {
                    order.setPaymentStatus(PaymentStatus.PAID);
                    log.info("Auto-updated payment status to PAID for COD order");
                }

                break;

            case "CANCELLED":
                log.info("Order cancelled - OrderId: {}", order.getId());
                break;

            default:
                log.info("Order status changed to: {} - OrderId: {}", newStatusName, order.getId());
        }
    }
    @Transactional
    public void updateOrderStatusFromInv(String orderNumber, UpdateOrderStatusFromInvRequest request) {
        Order order=orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with orderNumber: " + orderNumber));
        OrderStatus newStatus = orderStatusRepository.findById(request.getStatusId())
                .orElseThrow(() -> new RuntimeException("Status not found with ID: " + request.getStatusId()));
        if(newStatus.getName().equals("SHIPPED")){
            order.setShippedDate(LocalDateTime.now());
            log.info("Order shipped - OrderId: {}", order.getId());
        }else if(newStatus.getName().equals("CANCELLED")){
            order.setCancelledDate(LocalDateTime.now());
            log.info("Order cancelled - OrderId: {}", order.getId());
        }
        else
            throw new RuntimeException("Status change with name: "+newStatus.getName()+" is not allowed!");
        order.setStatus(newStatus);
        order.setNotes(request.getNotes());
        orderRepository.save(order);
    }

    private OrderResponse mapToResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomerId())
                .subtotal(order.getSubtotal())
                .fee(order.getFee())
                .discountAmount(order.getDiscountAmount())
                .totalAmount(order.getTotalAmount())
                .statusName(order.getStatus() != null ? order.getStatus().getName() : null)
                .paymentStatus(order.getPaymentStatus())
                .orderDate(order.getOrderDate())
                .createdAt(order.getCreatedAt())
                .build();
    }

    private OrderDetailResponse mapToDetailResponse(Order order, List<OrderItem> items) {
        OrderDetailResponse response = OrderDetailResponse.builder()
                .items(items.stream()
                        .map(this::mapToOrderItemResponse)
                        .collect(Collectors.toList()))
                .shippingName(order.getShippingName())
                .shippingAddress(order.getShippingAddress())
                .shippingPhone(order.getShippingPhone())
                .paymentMethod(order.getPaymentMethod())
                .promotionCode(order.getPromotionCode())
                .shippedDate(order.getShippedDate())
                .deliveredDate(order.getDeliveredDate())
                .cancelledDate(order.getCancelledDate())
                .notes(order.getNotes())
                .build();

        response.setId(order.getId());
        response.setOrderNumber(order.getOrderNumber());
        response.setCustomerId(order.getCustomerId());
        response.setSubtotal(order.getSubtotal());
        response.setFee(order.getFee());
        response.setDiscountAmount(order.getDiscountAmount());
        response.setTotalAmount(order.getTotalAmount());
        response.setStatusName(order.getStatus() != null ? order.getStatus().getName() : null);
        response.setPaymentStatus(order.getPaymentStatus());
        response.setOrderDate(order.getOrderDate());
        response.setCreatedAt(order.getCreatedAt());

        return response;
    }

    private OrderItemResponse mapToOrderItemResponse(OrderItem item) {
        String variantName = "Unknown Variant";
        String variantSku = "Unknown Variant";
        String productSlug = "Unknown Product Slug";
        String imageUrl = null;
        if (item.getProductSnapshot() != null) {
            Object nameObj = item.getProductSnapshot().get("name");
            if (nameObj != null) {
                variantName = nameObj.toString();
            }
            Object skuObj = item.getProductSnapshot().get("sku");
            if (skuObj != null) {
                variantSku = skuObj.toString();
            }
            Object slugObj = item.getProductSnapshot().get("slug");
            if (slugObj != null) {
                productSlug = slugObj.toString();
            }

            // Get first image from imageUrls
            Object imageUrlsObj = item.getProductSnapshot().get("imageUrls");

            if (imageUrlsObj instanceof Map<?, ?> imageUrlsMap) {
                Object mainImageObj = imageUrlsMap.get("main");
                if (mainImageObj != null) {
                    imageUrl = mainImageObj.toString();
                }
            }

        }

        return OrderItemResponse.builder()
                .id(item.getId())
                .variantId(item.getVariantId())
                .variantName(variantName)
                .variantSku(variantSku)
                .productSlug(productSlug)
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .imageUrl(imageUrl)
                .build();
    }


}