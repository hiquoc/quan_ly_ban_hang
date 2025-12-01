package com.datn.order_service.service;

import com.datn.order_service.client.*;
import com.datn.order_service.client.dto.VariantDTO;
import com.datn.order_service.client.dto.request.ReleaseStockRequest;
import com.datn.order_service.client.dto.request.ReserveStockRequest;
import com.datn.order_service.client.dto.request.ValidatePromotionRequest;
import com.datn.order_service.client.dto.response.PromotionValidationResponse;
import com.datn.order_service.dto.OrderEvent;
import com.datn.order_service.dto.PageCacheWrapper;
import com.datn.order_service.dto.request.*;
import com.datn.order_service.dto.response.*;
import com.datn.order_service.entity.Order;
import com.datn.order_service.entity.OrderItem;
import com.datn.order_service.entity.OrderStatus;
import com.datn.order_service.enums.PaymentStatus;
import com.datn.order_service.exception.OrderNotFoundException;
import com.datn.order_service.repository.OrderItemRepository;
import com.datn.order_service.repository.OrderRepository;
import com.datn.order_service.repository.OrderStatusRepository;
import com.datn.order_service.utils.OrderEventPublisher;
import com.datn.order_service.utils.WebhookUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
//    private final ReturnOrderRepository returnOrderRepository;
//    private final ReturnOrderItemRepository returnOrderItemRepository;

    private final DeliveryServiceClient deliveryServiceClient;
    private final InventoryServiceClient inventoryServiceClient;
    private final PromotionServiceClient promotionServiceClient;
    private final ProductServiceClient productServiceClient;
    private final CartServiceClient cartServiceClient;
    //    private final CloudinaryService cloudinaryService;
    private final OrderEventPublisher eventPublisher;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private WebhookUtils webhookUtils;

    /**
     * Create order from cart (checkout all or selected items)
     */
    @CacheEvict(
            value = "customerOrders",
            key = "#request.customerId + ':ALL:'"
    )
    @Transactional
    public OrderDetailResponse createOrderFromCart(CreateOrderRequest request) {
        log.info("Creating order from cart for customer: {} (clearCart={})",
                request.getCustomerId(), request.getClearCart());

        OrderDetailResponse orderResponse = createOrderInternal(request);

        // Handle cart based on clearCart flag
        handleCartAfterCheckout(request.getCustomerId(), request.getClearCart(),
                extractVariantIds(request.getItems()));

        eventPublisher.publish(new OrderEvent("ORDER_CREATED", orderResponse.getId(), orderResponse.getStatusName()));
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

        eventPublisher.publish(new OrderEvent("ORDER_CREATED", orderResponse.getId(), orderResponse.getStatusName()));
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
                .warehouseData(null)
                .build();

        // 5. Generate and update orderNumber with ID
        order = orderRepository.save(order);
        String orderNumber = generateOrderNumber(order.getId());
        order.setOrderNumber(orderNumber);
        order = orderRepository.save(order);

        log.info("Order created with number: {}", orderNumber);

        // === TRACK SUCCESSFULLY RESERVED STOCKS AND DELIVERY ORDERS===
        List<ReserveStockRequest> reservedStocks = new ArrayList<>();

        // 6. Create order items and calculate revenue
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal itemsProfit = BigDecimal.ZERO;
        List<Map<Long, Integer>> itemWarehouseData=new ArrayList<>();

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
                        Map<Long,Integer> reserveStockMap = inventoryServiceClient.reserveStock(stockRequest).getData();
                        itemWarehouseData.add(reserveStockMap);
                        orderItem.setItemWarehouseData(reserveStockMap);
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
            List<Long> warehouseKeys = itemWarehouseData.stream()
                    .flatMap(map -> map.keySet().stream())
                    .distinct()
                    .toList();
            order.setWarehouseData(warehouseKeys);
            order.setRevenue(revenue);
            orderRepository.save(order);

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

            webhookUtils.postToWebhook(order.getId(), "insert");
            return mapToDetailResponse(order, orderItems, false);

        } catch (Exception e) {
            log.warn("Order creation failed. Releasing {} successfully reserved stocks.", reservedStocks.size());
            if (!reservedStocks.isEmpty()) {
                try {
                    inventoryServiceClient.releaseStock(orderNumber, new ReleaseStockRequest("Loi he thong"));
                    log.info("All stocks released on rollback for order {}. Affected variants: {}",
                            orderNumber,
                            reservedStocks.stream()
                                    .map(rs -> rs.getVariantId() + "(" + rs.getQuantity() + ")")
                                    .collect(Collectors.joining(", ")));
                } catch (Exception releaseEx) {
                    log.error("Failed to release stocks for order: {}", orderNumber, releaseEx);
                    reservedStocks.forEach(rs ->
                            log.warn("Note: Variant {} qty {} was intended for release but op failed",
                                    rs.getVariantId(), rs.getQuantity())
                    );
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

    @Cacheable(
            value = "customerOrders",
            key = "#customerId + ':ALL:'",
            condition = "(#statusName == null || #statusName == 'ALL') && #pageable.pageNumber == 0"
    )
    public PageCacheWrapper<OrderDetailResponse> getCustomerOrders(Long customerId, String statusName, Pageable pageable) {
        log.info("Getting orders for customer: {}", customerId);

        Page<Order> orders = orderRepository.findByCustomerIdAndStatus(customerId, statusName, pageable);

        Page<OrderDetailResponse> pageResult = orders.map(order -> {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            return mapToDetailResponse(order, items, false);
        });

        return new PageCacheWrapper<>(
                pageResult.getContent(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.getNumber(),
                pageResult.getSize()
        );
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
            boolean showRevenue,
            Long warehouseId,
            boolean sortByDeliveredDate) {

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
            if(sortByDeliveredDate)
                predicates.add(cb.greaterThanOrEqualTo(root.get("deliveredDate"), startDateTime));
            else
                predicates.add(cb.greaterThanOrEqualTo(root.get("orderDate"), startDateTime));
        }
        if (endDateTime != null) {
            if(sortByDeliveredDate)
                predicates.add(cb.lessThan(root.get("deliveredDate"), endDateTime));
            else
                predicates.add(cb.greaterThanOrEqualTo(root.get("orderDate"), startDateTime));
        }

        if (warehouseId != null) {
            predicates.add(cb.isTrue(cb.function(
                    "jsonb_contains", Boolean.class,
                    root.get("warehouseData"),
                    cb.literal("[" + warehouseId + "]")
            )));
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
            if(sortByDeliveredDate)
                countPredicates.add(cb.greaterThanOrEqualTo(countRoot.get("deliveredDate"), startDateTime));
            else
                countPredicates.add(cb.greaterThanOrEqualTo(countRoot.get("orderDate"), startDateTime));
        }
        if (endDateTime != null) {
            if(sortByDeliveredDate)
                countPredicates.add(cb.lessThan(countRoot.get("deliveredDate"), endDateTime));
            else
                countPredicates.add(cb.lessThan(countRoot.get("orderDate"), endDateTime));
        }
        if (warehouseId != null) {
            countPredicates.add(cb.isTrue(cb.function(
                    "jsonb_contains", Boolean.class,
                    countRoot.get("warehouseData"),
                    cb.literal("[" + warehouseId + "]")
            )));
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
                    List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
                    return mapToDetailResponse(order, orderItems, false);
                }).toList(),
                pageable,
                total
        );
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, Long statusId, String notes, String role, Long staffId,Long currentWarehouseId) {
        log.info("Updating order {} to status {}", orderId, statusId);

        if ("CUSTOMER".equals(role)) {
            throw new IllegalStateException("You don't have permission to update this order!");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException("Order not found with ID: " + orderId));
        if (Objects.equals(order.getPaymentStatus().toString(), "PENDING") && !Objects.equals(order.getPaymentMethod(), "COD"))
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
        handleStatusChange(order, staffId, oldStatus, newStatus,currentWarehouseId);
        if (notes != null && !notes.isBlank()) {
            if (staffId == 2L) { // CONFIRMED
                String existingNotes = Optional.ofNullable(order.getNotes()).orElse("");
                String khoPart = "";
                int idx = existingNotes.toLowerCase().lastIndexOf("kho:");
                if (idx != -1) {
                    khoPart = existingNotes.substring(idx).trim();
                }
                order.setNotes(notes.trim() + (khoPart.isEmpty() ? "" : " - " + khoPart));
            } else {
                order.setNotes(notes);
            }
        }


        if ("DELIVERED".equals(newStatusName)) {
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
            if (oldStatusName.equals("PROCESSING")) {
                try {
                    deliveryServiceClient.cancelDeliveryOrderStatus(new CancelDeliveryOrderRequest(orderId, staffId, "Đơn hàng bị hủy bởi nhân viên NV" + staffId + "\nLý do: " + notes));
                } catch (FeignException e) {
                    log.error("Feign error canceling delivery order: Status={}", e.status());
                } catch (Exception e) {
                    log.error("Failed to canceling delivery order: {}", order.getOrderNumber(), e);
                }
            }
        }
        order = orderRepository.save(order);
        if (cacheManager != null) {
            Cache cache = cacheManager.getCache("customerOrders");
            if (cache != null) {
                String key = order.getCustomerId() + ":ALL:";
                cache.evict(key);
            }
        }
        webhookUtils.postToWebhook(order.getId(), "update");
        eventPublisher.publish(new OrderEvent("ORDER_STATUS_UPDATED", order.getId(), order.getStatus().getName()));
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
        if (cacheManager != null) {
            Cache cache = cacheManager.getCache("customerOrders");
            if (cache != null) {
                String key = order.getCustomerId() + ":ALL:";
                cache.evict(key);
            }
        }
        webhookUtils.postToWebhook(order.getId(), "update");
        eventPublisher.publish(new OrderEvent("ORDER_STATUS_UPDATED", order.getId(), order.getStatus().getName()));
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
        if (!"PENDING".equals(currentStatus) && !"CONFIRMED".equals(currentStatus)) {
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
        if (cacheManager != null) {
            Cache cache = cacheManager.getCache("customerOrders");
            if (cache != null) {
                String key = order.getCustomerId() + ":ALL:";
                cache.evict(key);
            }
        }
        webhookUtils.postToWebhook(order.getId(), "update");
        eventPublisher.publish(new OrderEvent("ORDER_STATUS_UPDATED", order.getId(), order.getStatus().getName()));
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

    private void handleStatusChange(Order order, Long staffId, OrderStatus oldStatus, OrderStatus newStatus,Long currentWarehouseId) {
        String newStatusName = newStatus.getName();

        switch (newStatusName) {
            case "CONFIRMED":
                log.info("Order confirmed - OrderId: {}", order.getId());
                break;

            case "PROCESSING":
                log.info("Order processing started - OrderId: {}", order.getId());
                System.out.println(currentWarehouseId);
                List<Long> warehouses = order.getWarehouseData();
                if (warehouses == null || warehouses.isEmpty()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đơn hàng không có dữ liệu kho");
                }

                String note = Optional.ofNullable(order.getNotes()).orElse("");
                List<Long> processedWarehouses = new ArrayList<>();

                String lower = note.toLowerCase();
                int idx = lower.lastIndexOf("kho:");
                if (idx != -1) {
                    String part = note.substring(idx + 4).trim();
                    processedWarehouses = Arrays.stream(part.split(","))
                            .map(String::trim)
                            .filter(s -> s.matches("\\d+"))
                            .map(Long::parseLong)
                            .collect(Collectors.toCollection(ArrayList::new));
                }

                // Admin/manager override → mark all warehouses as processed
                if (currentWarehouseId != null && currentWarehouseId == -1L) {
                    processedWarehouses = new ArrayList<>(warehouses);

                    note = note.split("(?i)kho:")[0].trim();
                    note = (note + " - Kho: " +
                            processedWarehouses.stream().map(String::valueOf).collect(Collectors.joining(",")))
                            .trim();

                    order.setNotes(note);
                } else {
                    // Thêm kho mới nếu chưa có
                    if (currentWarehouseId == null) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Vui lòng nhập mã kho khi đơn có nhiều kho");
                    }

                    if (!processedWarehouses.contains(currentWarehouseId)) {
                        processedWarehouses.add(currentWarehouseId);

                        note = note.split("(?i)kho:")[0].trim();
                        note = (note + " - Kho: " +
                                processedWarehouses.stream()
                                        .map(String::valueOf)
                                        .collect(Collectors.joining(",")))
                                .trim();

                        order.setNotes(note);
                    }
                }

                // Kiểm tra kho chưa xử lý
                List<Long> finalProcessedWarehouses = processedWarehouses;
                boolean stillLeft = warehouses.stream()
                        .anyMatch(id -> !finalProcessedWarehouses.contains(id));

                if (stillLeft) {
                    order.setStatus(orderStatusRepository.findByName("WAITING")
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                    "Không tìm thấy status WAITING!")));
                    orderRepository.save(order);

                    log.info("Order still has unprocessed warehouses → WAITING");
                    break;
                }

                log.info("All warehouses processed. Creating delivery orders...");

                try {
                    List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
                    Map<Long, List<DeliveryOrderItemRequest>> itemsByWarehouse = new HashMap<>();

                    for (OrderItem item : orderItems) {
                        Map<Long, Integer> splitData = item.getItemWarehouseData();
                        if (splitData == null) continue;
                        log.info("Processing item {} with warehouse data {}", item.getId(), splitData);
                        for (Map.Entry<Long, Integer> entry : splitData.entrySet()) {
                            Long warehouseId = entry.getKey();
                            Integer qty = entry.getValue();

                            if (qty == null || qty <= 0) continue;

                            Map<String, Object> snapshot = item.getProductSnapshot();
                            ObjectMapper mapper = new ObjectMapper();
                            Map<String, Object> imageUrls = mapper.convertValue(
                                    snapshot.get("imageUrls"),
                                    new TypeReference<>() {}
                            );
                            String mainImage = imageUrls.get("main").toString();

                            DeliveryOrderItemRequest deliveryItem = new DeliveryOrderItemRequest(
                                    item.getId(),
                                    item.getVariantId(),
                                    snapshot.get("name").toString(),
                                    snapshot.get("sku").toString(),
                                    item.getUnitPrice(),
                                    mainImage,
                                    qty
                            );

                            itemsByWarehouse
                                    .computeIfAbsent(warehouseId, k -> new ArrayList<>())
                                    .add(deliveryItem);
                        }
                    }

                    for (Map.Entry<Long, List<DeliveryOrderItemRequest>> entry : itemsByWarehouse.entrySet()) {
                        Long warehouseId = entry.getKey();
                        List<DeliveryOrderItemRequest> itemsForWarehouse = entry.getValue();

                        if (itemsForWarehouse.isEmpty()) continue;

                        deliveryServiceClient.createDeliveryOrder(
                                new DeliveryOrderRequest(
                                        order.getId(),
                                        order.getOrderNumber(),
                                        order.getShippingName(),
                                        order.getShippingAddress(),
                                        order.getShippingPhone(),
                                        order.getPaymentMethod(),
                                        warehouseId,
                                        order.getPaymentMethod().equals("COD")
                                                ? itemsForWarehouse.stream()
                                                .map(item -> item.getUnitPrice()
                                                        .multiply(BigDecimal.valueOf(item.getQuantity())))
                                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                                : BigDecimal.ZERO,
                                        itemsForWarehouse
                                )
                        );
                    }

                } catch (FeignException e) {
                    log.error("Lỗi nội bộ khi tạo đơn giao hàng: Status={}, Message={}", e.status(), e.getMessage());
                    throw new RuntimeException("Không thể kết nối tới hệ thống giao hàng, vui lòng thử lại sau.");
                } catch (Exception e) {
                    log.error("Lỗi không xác định khi tạo đơn giao hàng", e);
                    throw new RuntimeException("Đã xảy ra lỗi trong quá trình tạo đơn giao hàng.");
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
    public void updateOrderStatusFromInternal(UpdateOrderStatusFromInvRequest request) {
        List<Order> pendingOrdersToSave = new ArrayList<>();
        for (String orderNumber : request.getOrderNumbers()) {
            Order order = orderRepository.findByOrderNumber(orderNumber)
                    .orElseThrow(() -> new OrderNotFoundException("Order not found with orderNumber: " + orderNumber));
            OrderStatus newStatus = orderStatusRepository.findById(request.getStatusId())
                    .orElseThrow(() -> new RuntimeException("Status not found with ID: " + request.getStatusId()));
            switch (newStatus.getName()) {
                case "SHIPPED" -> {
                    order.setShippedDate(OffsetDateTime.now());
                    log.info("Order shipped - OrderId: {}", order.getId());
                }
                case "DELIVERED" -> {
                    List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
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
                    order.setDeliveredDate(OffsetDateTime.now());
                    log.info("Order delivered - OrderId: {}", order.getId());
                    if ("COD".equalsIgnoreCase(order.getPaymentMethod()) &&
                            order.getPaymentStatus() == PaymentStatus.PENDING) {
                        order.setPaymentStatus(PaymentStatus.PAID);
                        log.info("Auto-updated payment status to PAID for COD order");
                    }
                }
                case "PROCESSING" -> log.info("Order processing - OrderId: {}", order.getId());
                case "CANCELLED" -> {
                    order.setCancelledDate(OffsetDateTime.now());
                    log.info("Order cancelled - OrderId: {}", order.getId());
                }
                default ->
                        throw new RuntimeException("Status change with name: " + newStatus.getName() + " is not allowed!");
            }
            order.setStatus(newStatus);
            order.setNotes(request.getNotes());
            pendingOrdersToSave.add(order);
            webhookUtils.postToWebhook(order.getId(), "update");
            eventPublisher.publish(new OrderEvent("ORDER_STATUS_UPDATED", order.getId(), order.getStatus().getName()));
        }
        orderRepository.saveAll(pendingOrdersToSave);
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
                .warehouseData(order.getWarehouseData())
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
                .warehouseData(order.getWarehouseData())
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
                .itemWarehouseData(item.getItemWarehouseData())
                .build();
    }

    private static final Map<String, List<String>> ALLOWED_TRANSITIONS = Map.of(
            "PENDING", List.of("CONFIRMED", "CANCELLED"),
            "CONFIRMED", List.of("PROCESSING", "CANCELLED"),
            "PROCESSING", List.of("SHIPPED", "CANCELLED"),
            "SHIPPED", List.of("DELIVERED"),
            "DELIVERED", List.of(),
            "CANCELLED", List.of(),
            "RETURNED", List.of(),
            "WAITING",List.of("PROCESSING","CANCELLED")
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
                .deliveredDate(order.getDeliveredDate())
                .warehouseData(order.getWarehouseData())
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