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
import com.datn.order_service.dto.response.*;
import com.datn.order_service.entity.*;
import com.datn.order_service.enums.PaymentStatus;
import com.datn.order_service.enums.ReturnStatus;
import com.datn.order_service.exception.OrderNotFoundException;
import com.datn.order_service.repository.*;
import com.datn.order_service.service.cloud.CloudinaryService;
import com.datn.order_service.utils.WebhookUtils;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
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
    private final ReturnOrderRepository returnOrderRepository;
    private final ReturnOrderItemRepository returnOrderItemRepository;

    private final InventoryServiceClient inventoryServiceClient;
    private final PromotionServiceClient promotionServiceClient;
    private final ProductServiceClient productServiceClient;
    private final CartServiceClient cartServiceClient;
    private final CloudinaryService cloudinaryService;


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
                        log.info("Áp dụng khuyến mãi thành công - Mã: {}, Giảm: {}",
                                request.getPromotionCode(), discountAmount);
                    } else {
                        log.warn("Xác thực khuyến mãi thất bại: {}", promoResponse.getMessage());
                        throw new RuntimeException("Mã khuyến mãi không hợp lệ hoặc đã hết hạn");
                    }
                } else {
                    log.warn("Gọi API khuyến mãi không thành công: {}", apiResponse.getMessage());
                    throw new RuntimeException("Không thể xác thực mã khuyến mãi, vui lòng thử lại");
                }

            } catch (FeignException e) {
                log.error("Lỗi Feign ...", e);
                throw new RuntimeException("Không thể kết nối tới dịch vụ khuyến mãi", e);
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                log.error("Lỗi không xác định khi gọi service khuyến mãi", e);
                throw new RuntimeException("Có lỗi xảy ra khi xử lý khuyến mãi", e);
            }
        }

        // phi giao hang+phat sinh
        BigDecimal fee = BigDecimal.valueOf(0);
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
                .orderDate(OffsetDateTime.now())
                .notes(request.getNotes())
                .build();

        // 5. Generate and update orderNumber with ID
        order = orderRepository.save(order);
        String orderNumber = generateOrderNumber(order.getId());
        order.setOrderNumber(orderNumber);
        order = orderRepository.save(order);

        log.info("Order created with number: {}", orderNumber);

        // === TRACK SUCCESSFULLY RESERVED STOCKS ===
        List<ReserveStockRequest> reservedStocks = new ArrayList<>();

        // 6. Create order items and calculate revenue
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal itemsProfit = BigDecimal.ZERO;

        try {
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
                    BigDecimal importPrice = variant.getImportPrice() != null ? variant.getImportPrice() : BigDecimal.ZERO;

                    if (unitPrice == null) {
                        log.error("Selling price is null for variant: {}", itemReq.getVariantId());
                        throw new RuntimeException("Selling price not found for variant ID: " + itemReq.getVariantId());
                    }

                    BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                    BigDecimal itemProfit = (unitPrice.subtract(importPrice)).multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                    itemsProfit = itemsProfit.add(itemProfit);

                    OrderItem orderItem = OrderItem.builder()
                            .order(order)
                            .variantId(itemReq.getVariantId())
                            .quantity(itemReq.getQuantity())
                            .importPrice(importPrice)
                            .unitPrice(unitPrice)
                            .totalPrice(totalPrice)
                            .productSnapshot(createVariantSnapshot(variant))
                            .build();

                    orderItems.add(orderItem);

                    // === RESERVE STOCK WITH CONFIRMATION ===
                    ReserveStockRequest stockRequest = ReserveStockRequest.builder()
                            .variantId(itemReq.getVariantId())
                            .quantity(itemReq.getQuantity())
                            .orderNumber(order.getOrderNumber())
                            .build();

                    boolean stockReserved = false;
                    try {
                        inventoryServiceClient.reserveStock(stockRequest);
                        log.info("Stock reserved - ProductId: {}, VariantId: {}, Quantity: {}",
                                variant.getProductId(), itemReq.getVariantId(), itemReq.getQuantity());
                        stockReserved = true;
                    } catch (FeignException e) {
                        log.error("Failed to reserve stock for variant {}: Status={}",
                                itemReq.getVariantId(), e.status());
                        throw new RuntimeException("Sản phẩm " + variant.getName() + " không đủ để hoàn tất đơn đặt hàng!");
                    } catch (Exception e) {
                        log.error("Unexpected error reserving stock for variant: {}", itemReq.getVariantId(), e);
                        throw new RuntimeException("Failed to reserve stock for variant ID: " + itemReq.getVariantId());
                    }

                    // Only track if successfully reserved
                    if (stockReserved) {
                        reservedStocks.add(stockRequest);
                    }

                } catch (FeignException e) {
                    log.error("Failed to get variant info for variant {}: Status={}",
                            itemReq.getVariantId(), e.status());
                    throw new RuntimeException("Variant not found with ID: " + itemReq.getVariantId());
                }
            }

            orderItemRepository.saveAll(orderItems);
            log.info("Saved {} order items", orderItems.size());
            BigDecimal revenue = itemsProfit.subtract(fee).subtract(discountAmount != null ? discountAmount : BigDecimal.ZERO);
            order.setRevenue(revenue);
            orderRepository.save(order);
            WebhookUtils.postToWebhook(order.getId(),"insert");

            // 7. Record promotion usage if applicable
            if (promotionId != null && discountAmount != null && discountAmount.compareTo(BigDecimal.ZERO) > 0) {
                try {
                    ApiResponse<Void> usageResponse = promotionServiceClient.recordPromotionUsage(
                            promotionId,
                            request.getCustomerId(),
                            order.getId()
                    ).getBody();

                    assert usageResponse != null;
                    if (usageResponse.isSuccess()) {
                        log.info("Ghi nhận sử dụng mã khuyến mãi thành công - ID: {}", promotionId);
                    } else {
                        log.warn("Ghi nhận sử dụng mã khuyến mãi thất bại: {}", usageResponse.getMessage());
                        throw new RuntimeException("Không thể ghi nhận sử dụng mã khuyến mãi, vui lòng thử lại.");
                    }
                } catch (FeignException e) {
                    log.error("Lỗi Feign khi ghi nhận mã khuyến mãi: Status={}, Message={}", e.status(), e.getMessage());
                    throw new RuntimeException("Không thể kết nối tới dịch vụ khuyến mãi, vui lòng thử lại sau.");
                } catch (Exception e) {
                    log.error("Lỗi không xác định khi ghi nhận sử dụng mã khuyến mãi", e);
                    throw new RuntimeException("Đã xảy ra lỗi trong quá trình ghi nhận mã khuyến mãi.");
                }
            }

            log.info("Order created successfully - OrderNumber: {}, TotalAmount: {}",
                    orderNumber, totalAmount);

            return mapToDetailResponse(order, orderItems, false);

        } catch (Exception e) {
            log.warn("Order creation failed. Releasing {} successfully reserved stocks.", reservedStocks.size());
            for (ReserveStockRequest reserved : reservedStocks) {
                try {
                    inventoryServiceClient.releaseStock(orderNumber,new ReleaseStockRequest("Loi he thong"));
                    log.info("Stock released on rollback - VariantId: {}, Quantity: {}",
                            reserved.getVariantId(), reserved.getQuantity());
                } catch (Exception releaseEx) {
                    log.error("Failed to release stock during rollback for variant: {}",
                            reserved.getVariantId(), releaseEx);
                }
            }
            throw e;
        }
    }
    private void handleCartAfterCheckout(Long customerId, Boolean clearCart, Set<Long> variantIds) {
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

    public OrderDetailResponse getOrderByNumber(String orderNumber, boolean showRevenue) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with number: " + orderNumber));

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        return mapToDetailResponse(order, items, showRevenue);
    }

    public Page<OrderDetailResponse> getCustomerOrders(Long customerId, String statusName, Pageable pageable) {
        log.info("Getting orders for customer: {}", customerId);

        Page<Order> orders = orderRepository.findByCustomerIdAndStatus(customerId, statusName, pageable);

        return orders.map(order -> {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            return mapToDetailResponse(order, items, false);
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
            LocalDate toDate,
            boolean showRevenue) {

        Pageable pageable = (page == null || size == null)
                ? Pageable.unpaged()
                : PageRequest.of(page, size, Sort.by("id").descending());

        LocalDateTime startDateTime = fromDate != null ? fromDate.atStartOfDay() : null;
        LocalDateTime endDateTime = toDate != null ? toDate.plusDays(1).atStartOfDay() : null;

        Long customerId = null;
        if (keyword != null && keyword.toUpperCase().startsWith("KH")) {
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

        if (showRevenue)
            return new PageImpl<>(results.stream().map(this::mapToOrderRevenueResponse).toList(), pageable, total);
        return new PageImpl<>(
                results.stream().map(this::mapToResponse).toList(),
                pageable,
                total
        );
    }
    public Page<OrderDetailResponse> getOrdersDetailsAdvanced(
            Integer page,
            Integer size,
            String status,
            String keyword,
            LocalDate fromDate,
            LocalDate toDate) {

        Pageable pageable = (page == null || size == null)
                ? Pageable.unpaged()
                : PageRequest.of(page, size, Sort.by("id").descending());

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
                results.stream().map(order -> {
                    List<OrderItem> orderItems=orderItemRepository.findByOrderId(order.getId());
                    return mapToDetailResponse(order,orderItems,false);
                }).toList(),
                pageable,
                total
        );
    }


    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, Long statusId, String notes, String role, Long staffId) {
        log.info("Updating order {} to status {}", orderId, statusId);

        if ("CUSTOMER".equals(role)) {
            throw new IllegalStateException("You don't have permission to update this order!");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with ID: " + orderId));
        if(Objects.equals(order.getPaymentStatus().toString(), "PENDING") && !Objects.equals(order.getPaymentMethod(), "COD"))
            throw new IllegalStateException("Đơn hàng phải được thanh toán trước khi xác nhận!");

        OrderStatus newStatus = orderStatusRepository.findById(statusId)
                .orElseThrow(() -> new RuntimeException("Status not found with ID: " + statusId));

        OrderStatus oldStatus = order.getStatus();
        String oldStatusName = oldStatus.getName();
        String newStatusName = newStatus.getName();

        List<String> validNext = ALLOWED_TRANSITIONS.getOrDefault(oldStatusName, List.of());
        if (!validNext.contains(newStatusName)) {
            throw new IllegalStateException(String.format(
                    "Trạng thái không hợp lệ: %s → %s", oldStatusName, newStatusName
            ));
        }

        order.setStatus(newStatus);
        handleStatusChange(order, staffId, oldStatus, newStatus);
        if (notes != null && !notes.isBlank())
            order.setNotes(notes);

        if ("DELIVERED".equals(newStatusName)) {
//            if(!"SHIPPER".equals(role))
//                throw new IllegalStateException("Bạn không có quyền hoàn tất đơn hàng!");
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(orderId);
            if (!orderItems.isEmpty()) {
                try {
                    for (OrderItem item : orderItems) {
                        productServiceClient.updateVariantSold(item.getVariantId(), item.getQuantity());
                    }
                } catch (FeignException e) {
                    log.error("Failed to update variant sold count: {}", e.getMessage());
                    throw new RuntimeException("Failed to update variant sold count.");
                }
            }
        }
        if ("CANCELLED".equals(newStatusName)) {
            try {
                inventoryServiceClient.releaseStock(order.getOrderNumber(), new ReleaseStockRequest(notes));
            } catch (FeignException e) {
                log.error("Feign error releasing stock: Status={}", e.status());
            } catch (Exception e) {
                log.error("Failed to release stock for orderNumber: {}", order.getOrderNumber(), e);
            }
        }
        order = orderRepository.save(order);
        WebhookUtils.postToWebhook(order.getId(),"update");
        log.info("Order status updated successfully - OrderId: {}, NewStatus: {}", orderId, newStatus.getName());
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
            OrderStatus pendingStatus = orderStatusRepository.findByName("PENDING")
                    .orElse(null);
            if (pendingStatus != null && !order.getStatus().getName().equals("PENDING")) {
                order.setStatus(pendingStatus);
                order = orderRepository.save(order);
                log.info("Order status updated to PENDING after payment");
            }
        }
        WebhookUtils.postToWebhook(order.getId(),"update");
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
        order.setCancelledDate(OffsetDateTime.now());

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        String formattedDateTime = OffsetDateTime.now().format(formatter);

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
        WebhookUtils.postToWebhook(order.getId(),"update");
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
        if (variant != null) {
            snapshot.put("variantId", variant.getId());
            snapshot.put("productId", variant.getProductId());
            snapshot.put("name", variant.getName());
            snapshot.put("productName", variant.getProductName());
            snapshot.put("code", variant.getProductCode());
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

    private void handleStatusChange(Order order, Long staffId, OrderStatus oldStatus, OrderStatus newStatus) {
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
                order.setDeliveredDate(OffsetDateTime.now());
                log.info("Order delivered - OrderId: {}", order.getId());
                // Auto-update payment for COD
                if ("COD".equalsIgnoreCase(order.getPaymentMethod()) &&
                        order.getPaymentStatus() == PaymentStatus.PENDING) {
                    order.setPaymentStatus(PaymentStatus.PAID);
                    log.info("Auto-updated payment status to PAID for COD order");
                }

                break;

            case "CANCELLED":
                order.setCancelledDate(OffsetDateTime.now());
                log.info("Order cancelled - OrderId: {}", order.getId());
                break;

            default:
                log.info("Order status changed to: {} - OrderId: {}", newStatusName, order.getId());
        }
    }


    @Transactional
    public void updateOrderStatusFromInv(String orderNumber, UpdateOrderStatusFromInvRequest request) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with orderNumber: " + orderNumber));
        OrderStatus newStatus = orderStatusRepository.findById(request.getStatusId())
                .orElseThrow(() -> new RuntimeException("Status not found with ID: " + request.getStatusId()));
        if (newStatus.getName().equals("SHIPPED")) {
            order.setShippedDate(OffsetDateTime.now());
            log.info("Order shipped - OrderId: {}", order.getId());
        } else if (newStatus.getName().equals("CANCELLED")) {
            order.setCancelledDate(OffsetDateTime.now());
            log.info("Order cancelled - OrderId: {}", order.getId());
        } else
            throw new RuntimeException("Status change with name: " + newStatus.getName() + " is not allowed!");
        order.setStatus(newStatus);
        order.setNotes(request.getNotes());
        orderRepository.save(order);
        WebhookUtils.postToWebhook(order.getId(),"update");
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
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .orderDate(order.getOrderDate())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private OrderDetailResponse mapToDetailResponse(Order order, List<OrderItem> items, boolean showRevenue) {
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
        response.setRevenue(showRevenue ? order.getRevenue() : null);
        response.setStatusName(order.getStatus() != null ? order.getStatus().getName() : null);
        response.setPaymentStatus(order.getPaymentStatus());
        response.setOrderDate(order.getOrderDate());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        return response;
    }

    private OrderItemResponse mapToOrderItemResponse(OrderItem item) {
        String variantName = "Unknown Variant";
        String variantSku = "Unknown Variant";

        long productId = -1L;
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
            Object idObj = item.getProductSnapshot().get("productId");
            if (idObj != null) {
                productId = Long.parseLong(idObj.toString());
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
                .productId(productId)
                .productSlug(productSlug)
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .imageUrl(imageUrl)
                .returnRequested(item.isReturnRequested())
                .build();
    }

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "PENDING", List.of("CONFIRMED", "CANCELLED"),
            "CONFIRMED", List.of("PROCESSING", "CANCELLED"),
            "PROCESSING", List.of("SHIPPED", "CANCELLED"),
            "SHIPPED", List.of("DELIVERED"),
            "DELIVERED", List.of(),
            "CANCELLED", List.of(),
            "RETURNED", List.of()
    );

    public OrderDetailResponse getOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with id: " + orderId));
        List<OrderItem> orderItem = orderItemRepository.findByOrderId(orderId);
        return mapToDetailResponse(order, orderItem, false);
    }

    private OrderResponse mapToOrderRevenueResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomerId())
                .subtotal(order.getSubtotal())
                .fee(order.getFee())
                .discountAmount(order.getDiscountAmount())
                .totalAmount(order.getTotalAmount())
                .revenue(order.getRevenue())
                .statusName(order.getStatus() != null ? order.getStatus().getName() : null)
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .orderDate(order.getOrderDate())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    public OrderRecommendResponse getOrderRecommendationData() {
        return null;
    }

//    @Transactional
//    public ReturnOrderResponse createReturnOrder(ReturnOrderRequest request, List<MultipartFile> images) {
//        List<OrderItem> returnItems = orderItemRepository.findByOrderId(request.getOrderId());
//        if (returnItems.isEmpty())
//            throw new OrderNotFoundException("Không tìm thấy đơn hàng!");
//
//        Set<Long> variantIds = new HashSet<>();
//        for (ReturnOrderItemRequest itemRequest : request.getItems()) {
//            if (!variantIds.add(itemRequest.getVariantId())) {
//                throw new RuntimeException("Có biến thể bị trùng trong yêu cầu trả hàng: " + itemRequest.getVariantId());
//            }
//        }
//        Map<String, String> imageUrls = new HashMap<>();
//        if (images != null) {
//            try {
//                for (int i = 0; i < images.size(); i++) {
//                    imageUrls.put("side" + i, cloudinaryService.uploadFile(images.get(i)));
//                }
//            } catch (Exception e) {
//                imageUrls.values().forEach(url -> {
//                    try { cloudinaryService.deleteFile(url); }
//                    catch (Exception ex) { System.err.println("Cleanup failed: " + ex.getMessage()); }
//                });
//                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload images");
//            }
//        }
//
//        ReturnOrder returnOrder = ReturnOrder.builder()
//                .order(returnItems.get(0).getOrder())
//                .customerId(request.getCustomerId())
//                .reason(request.getReason())
//                .status(ReturnStatus.PENDING)
//                .images(imageUrls)
//                .bankName(request.getBankName())
//                .accountHolder(request.getAccountHolder())
//                .accountNumberEncrypted(request.getAccountNumber())
//                .build();
//
//        returnOrder = returnOrderRepository.save(returnOrder);
//
//        BigDecimal refundAmount = BigDecimal.ZERO;
//        for (ReturnOrderItemRequest itemRequest : request.getItems()) {
//            OrderItem orderItem = returnItems.stream()
//                    .filter(oi -> oi.getVariantId().equals(itemRequest.getVariantId()))
//                    .findFirst()
//                    .orElseThrow(() -> new OrderNotFoundException("Không tìm thấy biến thể trong đơn hàng!"));
//
//            if (itemRequest.getQuantity() > orderItem.getQuantity()) {
//                throw new RuntimeException("Số lượng trả lớn hơn số lượng đã mua!");
//            }
//            orderItem.setReturnRequested(true);
//            BigDecimal itemRefund = orderItem.getUnitPrice()
//                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
//            refundAmount = refundAmount.add(itemRefund);
//
//            ReturnOrderItem returnOrderItem = ReturnOrderItem.builder()
//                    .returnOrder(returnOrder)
//                    .variantId(orderItem.getVariantId())
//                    .quantity(itemRequest.getQuantity())
//                    .productSnapshot(orderItem.getProductSnapshot())
//                    .build();
//            returnOrderItemRepository.save(returnOrderItem);
//        }
//
//        returnOrder.setRefundAmount(refundAmount);
//        return toReturnOrderResponse(returnOrderRepository.save(returnOrder));
//    }
//
//    @Transactional(readOnly = true)
//    private ReturnOrderResponse toReturnOrderResponse(ReturnOrder returnOrder) {
//        List<ReturnOrderItem> returnOrderItems = returnOrderItemRepository.findByReturnOrderId(returnOrder.getId());
//        if (returnOrderItems.isEmpty())
//            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh sách biến thể trả hàng!");
//        return ReturnOrderResponse.builder()
//                .id(returnOrder.getId())
//                .orderId(returnOrder.getOrder().getId())
//                .orderNumber(returnOrder.getOrder().getOrderNumber())
//                .customerId(returnOrder.getCustomerId())
//                .reason(returnOrder.getReason())
//                .inspectionNotes(returnOrder.getInspectionNotes())
//                .status(returnOrder.getStatus())
//                .approvedBy(returnOrder.getApprovedBy())
//                .returnCondition(returnOrder.getReturnCondition())
//                .refundAmount(returnOrder.getRefundAmount())
//                .items(returnOrderItems.stream().map(this::toReturnOrderItemResponse).toList())
//                .createdAt(returnOrder.getCreatedAt())
//                .updatedAt(returnOrder.getUpdatedAt())
//                .approvedAt(returnOrder.getApprovedAt())
//                .receivedAt(returnOrder.getReceivedAt())
//                .build();
//    }
//
//    private ReturnOrderItemResponse toReturnOrderItemResponse(ReturnOrderItem item) {
//        String variantName = "Unknown Variant";
//        String variantSku = "Unknown Variant";
//        long productId = 0L;
//        String productSlug = "Unknown Product Slug";
//        String imageUrl = null;
//        BigDecimal unitPrice = BigDecimal.ZERO;
//        if (item.getProductSnapshot() != null) {
//            Object nameObj = item.getProductSnapshot().get("name");
//            if (nameObj != null) {
//                variantName = nameObj.toString();
//            }
//            Object skuObj = item.getProductSnapshot().get("sku");
//            if (skuObj != null) {
//                variantSku = skuObj.toString();
//            }
//            Object productIdObj = item.getProductSnapshot().get("productId");
//            if (productIdObj != null)
//                productId = Long.parseLong(productIdObj.toString());
//            Object slugObj = item.getProductSnapshot().get("slug");
//            if (slugObj != null) {
//                productSlug = slugObj.toString();
//            }
//            Object unitPriceObj = item.getProductSnapshot().get("sellingPrice");
//            if (unitPriceObj != null) {
//                unitPrice = new BigDecimal(unitPriceObj.toString());
//            }
//            // Get first image from imageUrls
//            Object imageUrlsObj = item.getProductSnapshot().get("imageUrls");
//
//            if (imageUrlsObj instanceof Map<?, ?> imageUrlsMap) {
//                Object mainImageObj = imageUrlsMap.get("main");
//                if (mainImageObj != null) {
//                    imageUrl = mainImageObj.toString();
//                }
//            }
//
//        }
//        return ReturnOrderItemResponse.builder()
//                .id(item.getId())
//                .returnOrderId(item.getReturnOrder().getId())
//                .variantId(item.getVariantId())
//                .variantName(variantName)
//                .variantSku(variantSku)
//                .productId(productId)
//                .productSlug(productSlug)
//                .imageUrl(imageUrl)
//                .quantity(item.getQuantity())
//                .unitPrice(unitPrice)
//                .build();
//    }
//
//    public List<ReturnOrderResponse> getAllReturnOrders() {
//        return returnOrderRepository.findAll().stream().map(this::toReturnOrderResponse).toList();
//    }
}