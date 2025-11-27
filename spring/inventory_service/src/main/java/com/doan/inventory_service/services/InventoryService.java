package com.doan.inventory_service.services;

import com.doan.inventory_service.dtos.inventory.InventoryQuantityChangeDailyResponse;
import com.doan.inventory_service.dtos.inventory.InventoryQuantityChangeResponse;
import com.doan.inventory_service.dtos.inventory.InventoryResponse;
import com.doan.inventory_service.dtos.inventory.InventoryResponseForVariant;
import com.doan.inventory_service.dtos.order.UpdateOrderStatusFromInvRequest;
import com.doan.inventory_service.dtos.productVariant.VariantResponse;
import com.doan.inventory_service.dtos.transaction.*;
import com.doan.inventory_service.models.Inventory;
import com.doan.inventory_service.models.InventoryTransaction;
import com.doan.inventory_service.models.Warehouse;
import com.doan.inventory_service.repositories.InventoryRepository;
import com.doan.inventory_service.repositories.InventoryTransactionRepository;
import com.doan.inventory_service.repositories.PurchaseOrderRepository;
import com.doan.inventory_service.repositories.WarehouseRepository;
import com.doan.inventory_service.services.clients.OrderServiceClient;
import com.doan.inventory_service.services.clients.ProductServiceClient;
import com.doan.inventory_service.utils.WebhookUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final WarehouseRepository warehouseRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final ProductServiceClient productServiceClient;
    private final OrderServiceClient orderServiceClient;

    // ---------------------- INVENTORY SEARCH ----------------------
    public Page<InventoryResponse> searchInventories(Integer page, Integer size, String keyword, Long warehouseId, Boolean active) {
        Pageable pageable = (page == null || size == null)
                ? Pageable.unpaged()
                : PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<Inventory> inventory;
        Boolean isActive = active == null || active;

        List<Long> variantIds = null;
        if (keyword != null && !keyword.isBlank()) {
            try {
                variantIds = productServiceClient.searchVariantIds(keyword);
                if(variantIds.isEmpty())
                    variantIds=List.of(-1L);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi tìm variant", e);
            }
        }

        inventory = inventoryRepository.searchInventories(variantIds, isActive, warehouseId, pageable);


        Map<Long, VariantResponse> variantMap = productServiceClient
                .getVariantsByIds(inventory.getContent().stream()
                        .map(Inventory::getVariantId)
                        .toList())
                .stream()
                .collect(Collectors.toMap(VariantResponse::getId, v -> v));

        List<InventoryResponse> responses = inventory.getContent().stream()
                .map(i -> new InventoryResponse(
                        i.getId(),
                        Optional.ofNullable(variantMap.get(i.getVariantId())),
                        i.getWarehouse(),
                        i.getQuantity(),
                        i.getReservedQuantity(),
                        i.isActive(),
                        i.getCreatedAt(),
                        i.getUpdatedAt()
                ))
                .toList();


        return new PageImpl<>(responses, pageable, inventory.getTotalElements());
    }

    public List<InventoryResponse> searchInventoryByVariantId(Long id) {
        return inventoryRepository.findByVariantId(id).stream().map(i ->
                new InventoryResponse(
                        i.getId(),
                        null,
                        i.getWarehouse(),
                        i.getQuantity(),
                        i.getReservedQuantity(),
                        i.isActive(),
                        null,
                        null)
        ).toList();
    }

    public void changeItemActive(Long id,String role,Long staffWarehouseId) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm!"));
        if(role.equals("STAFF")&&!Objects.equals(inventory.getWarehouse().getId(), staffWarehouseId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền cập nhật!");
        inventory.setActive(!inventory.isActive());
        inventoryRepository.save(inventory);
        WebhookUtils.postToWebhook(inventory.getId(), "update");
    }

    // ---------------------- RESERVE / RELEASE STOCK ----------------------
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Map<Long,Integer> reserveStock(ReserveStockRequest request) {
        Map<Long,Integer> warehouseData = new HashMap<>();
        List<Inventory> inventories = inventoryRepository.findByVariantId(request.getVariantId());
        int pending = request.getQuantity();
        int totalAvailable = inventories.stream()
                .mapToInt(inv -> inv.getQuantity() - inv.getReservedQuantity())
                .sum();

        if (totalAvailable < pending) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Không đủ sản phẩm trong kho để đặt giữ");
        }
        for (Inventory inv : inventories) {
            if (!inv.isActive()) continue;
            int available = inv.getQuantity() - inv.getReservedQuantity();
            if (available <= 0) continue;

            int add = Math.min(pending, available);
            inv.setReservedQuantity(inv.getReservedQuantity() + add);
            inventoryRepository.save(inv);
            warehouseData.merge(inv.getWarehouse().getId(), add, Integer::sum);
            updateVariantStatusInternal(inv.getVariantId(),
                    inv.getQuantity() - (inv.getReservedQuantity() - add),
                    inv.getQuantity() - inv.getReservedQuantity()
            );

            InventoryTransaction transaction = InventoryTransaction.builder()
                    .code(generateTransactionCode("RESERVE"))
                    .inventory(inv)
                    .transactionType("RESERVE")
                    .status("PENDING")
                    .quantity(add)
                    .referenceType("ORDER")
                    .referenceCode(request.getOrderNumber())
                    .build();
            inventoryTransactionRepository.save(transaction);
            pending -= add;
            if (pending == 0) break;
        }
        if (pending > 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đủ sản phẩm trong kho để đặt giữ");
        for (Inventory inv : inventories) {
            WebhookUtils.postToWebhook(inv.getId(), "update");
        }
        return warehouseData;
    }

    @Transactional
    public void releaseStock(String orderNumber, String reason, boolean changeToReservedQuantity) {
        List<InventoryTransaction> reserves = inventoryTransactionRepository
                .findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatus(
                        "ORDER", orderNumber, "RESERVE", "PENDING");

        for (InventoryTransaction reserve : reserves) {

            Inventory inv = reserve.getInventory();
            int quantity = reserve.getQuantity();

            if (changeToReservedQuantity) {
                int newReserved = inv.getReservedQuantity() - quantity;
                if (newReserved < 0) newReserved = 0;
                inv.setReservedQuantity(newReserved);
                inventoryRepository.save(inv);
                WebhookUtils.postToWebhook(inv.getId(), "update");
                updateVariantStatusInternal(inv.getVariantId(),
                        inv.getQuantity() - (inv.getReservedQuantity() + quantity),
                        inv.getQuantity() - inv.getReservedQuantity()
                );
            }

            InventoryTransaction release = InventoryTransaction.builder()
                    .code(generateTransactionCode("RELEASE"))
                    .inventory(inv)
                    .transactionType("RELEASE")
                    .quantity(quantity)
                    .referenceType("ORDER")
                    .referenceCode(orderNumber)
                    .status("COMPLETED")
                    .note(reason)
                    .build();
            inventoryTransactionRepository.save(release);

            reserve.setStatus("CANCELLED");
            inventoryTransactionRepository.save(reserve);
        }
    }

    // ---------------------- ORDER / TRANSACTIONS ----------------------
    @Transactional
    public void createOrderTransaction(List<OrderTransactionRequest> request) {
        for (OrderTransactionRequest order : request) {
            for (OrderItemTransactionRequest orderItem : order.getOrderItems()) {
                List<InventoryTransaction> reserves = inventoryTransactionRepository
                        .findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatus(
                                "ORDER", order.getOrderNumber(), "RESERVE", "PENDING");

                int pending = orderItem.getQuantity();

                for (InventoryTransaction reserve : reserves) {
                    if (pending <= 0) break;

                    if (!reserve.getInventory().getVariantId().equals(orderItem.getVariantId())) continue;

                    int reservedQty = reserve.getQuantity();
                    if (reservedQty <= 0) continue;

                    int exportQty = Math.min(reservedQty, pending);

                    InventoryTransaction exportTransaction = InventoryTransaction.builder()
                            .code(generateTransactionCode("EXPORT"))
                            .inventory(reserve.getInventory())  // QUAN TRỌNG: Dùng cùng inventory (cùng kho)
                            .transactionType("EXPORT")
                            .quantity(exportQty)
                            .pricePerItem(orderItem.getPricePerItem())
                            .referenceType("ORDER")
                            .referenceCode(order.getOrderNumber())
                            .status("PENDING")
                            .createdBy(order.getShipperId())
                            .build();
                    inventoryTransactionRepository.save(exportTransaction);
                    updateTransactionStatus(exportTransaction.getId(), "COMPLETED", null, exportTransaction.getCreatedBy(),"",null);

                    pending -= exportQty;
                }

                if (pending > 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Không đủ số lượng đã reserve cho sản phẩm! Cần: " + orderItem.getQuantity() + ", Đã reserve: " + (orderItem.getQuantity() - pending));
                }
            }
        }

    }


    @Transactional
    public InventoryTransactionResponse createTransactions(List<InventoryTransactionRequest> requestList, Long staffId) {
        if (requestList == null || requestList.isEmpty()) {
            return null;
        }
        int originalSize = requestList.size();
        Map<Long, Warehouse> warehouseCache = new HashMap<>();
        List<InventoryTransaction> transactions = new ArrayList<>();
        for (InventoryTransactionRequest request : requestList) {
            Long warehouseId = request.getWarehouseId();
            Warehouse warehouse = warehouseCache.computeIfAbsent(warehouseId, id ->
                    warehouseRepository.findById(id)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kho!"))
            );
            if (!"ADJUST".equals(request.getTransactionType())) {
                if (request.getReferenceType() != null && request.getReferenceCode() == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng điền đầy đủ thông tin!");
                }
            }

            AtomicBoolean existed = new AtomicBoolean(true);
            Inventory inventory = inventoryRepository.findByVariantIdAndWarehouseId(
                            request.getVariantId(),
                            request.getWarehouseId())
                    .orElseGet(() -> {
                        existed.set(false);
                        return Inventory.builder()
                                .variantId(request.getVariantId())
                                .warehouse(warehouse)
                                .quantity(0)
                                .reservedQuantity(0)
                                .isActive(true)
                                .build();
                    });

            inventoryRepository.save(inventory);
            WebhookUtils.postToWebhook(inventory.getId(), existed.get() ? "update" : "insert");

            int quantityToUse = "ADJUST".equals(request.getTransactionType()) ? request.getQuantity() : Math.abs(request.getQuantity());
            InventoryTransaction inventoryTransaction = new InventoryTransaction(
                    generateTransactionCode(request.getTransactionType()),
                    inventory,
                    request.getTransactionType(),
                    quantityToUse,
                    request.getPricePerItem(),
                    request.getNote(),
                    request.getReferenceType(),
                    request.getReferenceCode(),
                    staffId
            );
            inventoryTransactionRepository.save(inventoryTransaction);
            transactions.add(inventoryTransaction);
            if ("EXPORT".equals(request.getTransactionType())) {
                int available = inventory.getQuantity() - inventory.getReservedQuantity();
                if (available < request.getQuantity()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng sản phẩm trong kho không đủ!");
                }
                updateReservedQuantity(inventory.getId(), inventory.getReservedQuantity() + request.getQuantity());
            }

        }
        if (originalSize == 1)
            return transactionResponseMapper(List.of(transactions.getFirst())).getFirst();
        return null;
    }

    @Transactional
    public void updateTransactionStatus(Long id, String status, String note, Long staffId,String role,Long staffWarehouseId) {
        InventoryTransaction transaction = inventoryTransactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy phiếu!"));
        if(role.equals("STAFF")&&!Objects.equals(transaction.getInventory().getWarehouse().getId(), staffWarehouseId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền cập nhật!");

        if ("RESERVE".equals(transaction.getTransactionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không được phép chỉnh sửa phiếu này!");
        }

        Inventory inventory = transaction.getInventory();
        if (!inventory.isActive())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Món hàng này hiện tại đang bị khóa!");
        int oldQuantity = inventory.getQuantity();
        int oldReserved = inventory.getReservedQuantity();
        int newQuantity;
        int newReserved;

        if ("COMPLETED".equals(status)) {
            switch (transaction.getTransactionType().trim()) {
                case "EXPORT" -> {
                    newQuantity = oldQuantity - Math.abs(transaction.getQuantity());
                    newReserved = oldReserved - Math.abs(transaction.getQuantity());

                    if (newQuantity < 0 || newReserved < 0)
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng hàng trong kho không đủ!");

                    inventory.setQuantity(newQuantity);
                    inventory.setReservedQuantity(newReserved);
                }
                case "IMPORT" -> {
                    newQuantity = oldQuantity + Math.abs(transaction.getQuantity());
                    inventory.setQuantity(newQuantity);
                    if ("PURCHASE_ORDER".equals(transaction.getReferenceType()) &&
                            transaction.getPricePerItem().compareTo(BigDecimal.ZERO) > 0) {
                        productServiceClient.updateVariantImportPrice(
                                inventory.getVariantId(),
                                oldQuantity,
                                newQuantity,
                                transaction.getPricePerItem()
                        );
                    }
                }
                case "ADJUST" -> {
                    newQuantity = oldQuantity + transaction.getQuantity();
                    if (newQuantity < 0)
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng hàng trong kho không đủ!");
                    inventory.setQuantity(newQuantity);
                }
                default ->
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại giao dịch không hợp lệ! " + transaction.getTransactionType());
            }

            // Only update variant status if it actually changed
            refreshVariantStatus(inventory.getVariantId());
        } else if ("CANCELLED".equals(status)) {
            if ("EXPORT".equals(transaction.getTransactionType())) {
                newReserved = oldReserved - Math.abs(transaction.getQuantity());
                if (newReserved < 0)
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giao dịch không hợp lệ!");
                inventory.setReservedQuantity(newReserved);
                updateVariantStatusInternal(inventory.getVariantId(), oldQuantity - oldReserved, oldQuantity - newReserved);
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái giao dịch không hợp lệ!");
        }
        transaction.setNote(note);
        transaction.setUpdatedBy(staffId);
        inventoryRepository.save(inventory);
        WebhookUtils.postToWebhook(inventory.getId(), "update");

        transaction.setStatus(status);
        inventoryTransactionRepository.save(transaction);
        if ("ORDER".equals(transaction.getReferenceType())) {
            String orderNumber = transaction.getReferenceCode();
            UpdateOrderStatusFromInvRequest orderUpdateRequest = new UpdateOrderStatusFromInvRequest(
                    List.of(orderNumber),
                    staffId,
                    Objects.equals(transaction.getTransactionType(), "EXPORT")? 4L :6L, // 4 = shipped, 6 cancelled
                    note
            );

            if (orderUpdateRequest.getStatusId() != null) {
                boolean isCompletedRequest = orderUpdateRequest.getStatusId() == 4L; // COMPLETED
                List<InventoryTransaction> allReserves =
                        inventoryTransactionRepository.findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatus(
                                "ORDER", orderNumber, "RESERVE", "PENDING"
                        );
                try {
                    List<InventoryTransaction> allTransactions =
                            inventoryTransactionRepository.findByReferenceTypeAndReferenceCodeAndTransactionType(
                                    "ORDER", orderNumber, "EXPORT"
                            );

                    if (isCompletedRequest) {
                        for (InventoryTransaction i : allReserves) {
                            if (Objects.equals(i.getInventory().getId(), transaction.getInventory().getId())) {
                                i.setStatus("COMPLETED");
                                inventoryTransactionRepository.save(i);
                                break;
                            }
                        }
                        boolean allCompleted = allTransactions.stream()
                                .allMatch(t -> "COMPLETED".equals(t.getStatus()));
                        if (allCompleted) {
                            orderServiceClient.updateOrderStatus(orderUpdateRequest);
                        }
                    } else {
                        List<InventoryTransaction> pendingTransactions = allTransactions.stream()
                                .filter(t -> "PENDING".equals(t.getStatus()))
                                .toList();

                        for (InventoryTransaction i : pendingTransactions) {
                            i.setStatus("CANCELLED");
                            i.setNote(note);
                            inventoryTransactionRepository.save(i);
                        }
                        releaseStock(orderNumber, note, false);

                        for (InventoryTransaction i : allReserves) {
                            i.setStatus("CANCELLED");
                            inventoryTransactionRepository.save(i);
                        }
                        orderServiceClient.updateOrderStatus(orderUpdateRequest);
                    }

                } catch (ResponseStatusException ex) {
                    throw new ResponseStatusException(
                            ex.getStatusCode(),
                            "Cập nhật đơn hàng thất bại: " + ex.getReason()
                    );
                }
            }
        }

    }

    // ---------------------- TRANSACTION QUERIES ----------------------
    @Autowired
    private EntityManager em;

    public Page<InventoryTransactionResponse> getTransactions(
            Integer page,
            Integer size,
            String status,
            String type,
            LocalDate startDate,
            LocalDate endDate,
            String keyword,
            String keywordType,
            Boolean ignoreReserveRelease,
            Long warehouseId
    ) {
        CriteriaBuilder cb = em.getCriteriaBuilder();

        // --- Result query ---
        CriteriaQuery<InventoryTransaction> cq = cb.createQuery(InventoryTransaction.class);
        Root<InventoryTransaction> root = cq.from(InventoryTransaction.class);
        Join<InventoryTransaction, Inventory> inventoryJoin = root.join("inventory", JoinType.LEFT);
        Join<Inventory, Warehouse> warehouseJoin = inventoryJoin.join("warehouse", JoinType.LEFT);

        List<Predicate> predicates = buildPredicates(cb, root, inventoryJoin, warehouseJoin,
                status, type, startDate, endDate, keyword, keywordType, ignoreReserveRelease, warehouseId);

        cq.where(predicates.toArray(new Predicate[0]));
        cq.orderBy(cb.desc(root.get("createdAt")));

        TypedQuery<InventoryTransaction> query = em.createQuery(cq)
                .setFirstResult(page * size)
                .setMaxResults(size);

        List<InventoryTransaction> resultList = query.getResultList();

        // --- Count query ---
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<InventoryTransaction> countRoot = countQuery.from(InventoryTransaction.class);
        Join<InventoryTransaction, Inventory> countInventoryJoin = countRoot.join("inventory", JoinType.LEFT);
        Join<Inventory, Warehouse> countWarehouseJoin = countInventoryJoin.join("warehouse", JoinType.LEFT);

        List<Predicate> countPredicates = buildPredicates(cb, countRoot, countInventoryJoin, countWarehouseJoin,
                status, type, startDate, endDate, keyword, keywordType, ignoreReserveRelease, warehouseId);

        countQuery.select(cb.count(countRoot))
                .where(countPredicates.toArray(new Predicate[0]));

        Long total = em.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(transactionResponseMapper(resultList), PageRequest.of(page, size), total);
    }

    private List<Predicate> buildPredicates(
            CriteriaBuilder cb,
            Root<InventoryTransaction> root,
            Join<InventoryTransaction, Inventory> inventoryJoin,
            Join<Inventory, Warehouse> warehouseJoin,
            String status,
            String type,
            LocalDate startDate,
            LocalDate endDate,
            String keyword,
            String keywordType,
            Boolean ignoreReserveRelease,
            Long warehouseId
    ) {
        List<Predicate> predicates = new ArrayList<>();
        if (warehouseId != null) {
            predicates.add(cb.equal(warehouseJoin.get("id"), warehouseId));
        }
        if (status != null && !status.isBlank()) {
            predicates.add(cb.equal(root.get("status"), status));
        }
        if (type != null && !type.isBlank()) {
            predicates.add(cb.equal(root.get("transactionType"), type));
        }
        if (startDate != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        }
        if (endDate != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }
        if (ignoreReserveRelease == null || ignoreReserveRelease) {
            predicates.add(cb.not(root.get("transactionType").in("RESERVE", "RELEASE")));
        }

        // Keyword filters
        if (keyword != null && !keyword.isBlank() && keywordType != null && !keywordType.isBlank()) {
            switch (keywordType) {
                case "ma_phieu":
                    predicates.add(cb.like(cb.lower(root.get("code")), "%" + keyword.toLowerCase() + "%"));
                    break;
                case "ma_sku":
                    List<Long> variantIds = productServiceClient.searchVariantIds(keyword);
                    if (!variantIds.isEmpty()) {
                        predicates.add(inventoryJoin.get("variantId").in(variantIds));
                    } else {
                        predicates.add(cb.disjunction());
                    }
                    break;
            }
        }

        return predicates;
    }


    public Page<InventoryTransactionResponse> getTransaction(
            Long id, Integer page, Integer size, LocalDate fromDate, LocalDate toDate,String role,Long staffWarehouseId) {

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'Đến ngày' không thể bé hơn 'Từ ngày'");

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm món hàng!"));
        if(role.equals("STAFF")&&!Objects.equals(inventory.getWarehouse().getId(), staffWarehouseId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền xem!");
        Pageable pageable = (page != null && size != null)
                ? PageRequest.of(page, size, Sort.by("createdAt").descending())
                : Pageable.unpaged();

        Page<InventoryTransaction> pagedTransactions;

        if (fromDate != null && toDate != null) {
            OffsetDateTime start = fromDate.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
            OffsetDateTime end = toDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
            pagedTransactions = pageable.isPaged()
                    ? inventoryTransactionRepository.findByInventoryIdAndCreatedAtBetween(inventory.getId(), start, end, pageable)
                    : new PageImpl<>(inventoryTransactionRepository.findByInventoryIdAndCreatedAtBetween(inventory.getId(), start, end));
        } else {
            pagedTransactions = pageable.isPaged()
                    ? inventoryTransactionRepository.findByInventoryId(inventory.getId(), pageable)
                    : new PageImpl<>(inventoryTransactionRepository.findByInventoryId(inventory.getId(), Sort.by("createdAt").descending()));
        }

        List<InventoryTransactionResponse> mapped = transactionResponseMapper(pagedTransactions.getContent());
        return new PageImpl<>(mapped, pagedTransactions.getPageable(), pagedTransactions.getTotalElements());
    }

    public InventoryQuantityChangeResponse calculateNumOfItemWithDailyChanges(
            Long id, OffsetDateTime from, OffsetDateTime to,String role,Long staffWarehouseId) {

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy món hàng với id: " + id));
        if(role.equals("STAFF")&&!Objects.equals(inventory.getWarehouse().getId(), staffWarehouseId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có cập nhật!");

        int currentQuantity = inventory.getQuantity();
        if (to == null) to = OffsetDateTime.now();
        if (from == null) from = OffsetDateTime.MIN;

        // Use 'to', not now()
        List<InventoryTransaction> transactions = inventoryTransactionRepository
                .findByInventoryIdAndStatusAndUpdatedAtBetweenOrderByCreatedAtAsc(
                        id, "COMPLETED", from, to);

        if (transactions.isEmpty()) {
            return new InventoryQuantityChangeResponse(currentQuantity, currentQuantity, List.of());
        }

        int fromQuantity = currentQuantity;
        for (InventoryTransaction t : transactions) {
            int delta = switch (t.getTransactionType()) {
                case "IMPORT" -> +t.getQuantity();
                case "EXPORT", "ADJUST" -> -t.getQuantity();
                default -> 0;
            };
            fromQuantity -= delta;
        }

        Map<LocalDate, Integer> dailyDelta = new TreeMap<>();
        for (InventoryTransaction t : transactions) {
            OffsetDateTime ts = t.getCreatedAt();
            if (ts.isBefore(to)) {
                int delta = switch (t.getTransactionType()) {
                    case "IMPORT" -> +t.getQuantity();
                    case "EXPORT", "ADJUST" -> -t.getQuantity();
                    default -> 0;
                };
                dailyDelta.merge(ts.toLocalDate(), delta, Integer::sum);
            }
        }

        List<InventoryQuantityChangeDailyResponse> dailyChanges = new ArrayList<>();
        int runningTotal = fromQuantity;
        for (Map.Entry<LocalDate, Integer> e : dailyDelta.entrySet()) {
            runningTotal += e.getValue();
            dailyChanges.add(new InventoryQuantityChangeDailyResponse(
                    e.getKey(), e.getValue(), runningTotal
            ));
        }

        int finalToQuantity = dailyChanges.isEmpty() ? fromQuantity : dailyChanges.getLast().getRunningTotal();

        return new InventoryQuantityChangeResponse(fromQuantity, finalToQuantity, dailyChanges);
    }

    @Transactional
    private List<InventoryTransactionResponse> transactionResponseMapper(List<InventoryTransaction> list) {
        Map<Long, VariantResponse> variantMap = productServiceClient
                .getVariantsByIds(list.stream()
                        .map(it -> it.getInventory().getVariantId())
                        .toList())
                .stream()
                .collect(Collectors.toMap(VariantResponse::getId, v -> v));
        return list.stream().map(it ->
                InventoryTransactionResponse.builder()
                        .id(it.getId())
                        .variant(Optional.ofNullable(variantMap.get(it.getInventory().getVariantId())))
                        .warehouse(it.getInventory().getWarehouse())
                        .code(it.getCode())
                        .transactionType(it.getTransactionType())
                        .quantity(it.getQuantity())
                        .pricePerItem(it.getPricePerItem())
                        .note(it.getNote())
                        .referenceType(it.getReferenceType())
                        .referenceCode(it.getReferenceCode())
                        .status(it.getStatus())
                        .createdBy(it.getCreatedBy())
                        .updatedBy(it.getUpdatedBy())
                        .createdAt(it.getCreatedAt())
                        .updatedAt(it.getUpdatedAt())
                        .build()
        ).toList();
    }

    public List<InventoryResponseForVariant> getInventoriesByVariantIds(List<Long> variantIds) {
        List<Inventory> inventories = inventoryRepository.findByVariantIdIn(variantIds);
        return inventories.stream()
                .map(inv -> new InventoryResponseForVariant(inv.getVariantId(), inv.getWarehouse().getName(),
                        inv.getQuantity(), inv.getReservedQuantity()))
                .toList();
    }

    public Integer getAvailableQuantity(Long variantId) {
        List<Inventory> inventories = inventoryRepository.findByVariantId(variantId);
        return inventories.stream()
                .mapToInt(i -> i.getQuantity() - i.getReservedQuantity())
                .sum();
    }

    public List<Long> getItemsWarehouseId(String orderNumber) {
        List<InventoryTransaction> reserves = inventoryTransactionRepository
                .findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatus(
                        "ORDER", orderNumber, "RESERVE", "PENDING");
        return reserves.stream().map(it -> it.getInventory().getWarehouse().getId()).toList();
    }

    // ---------------------- TRANSACTION CODE / VARIANT STATUS ----------------------
    public String generateTransactionCode(String transactionType) {
        String prefix;
        switch (transactionType.toUpperCase()) {
            case "RESERVE" -> prefix = "RES";
            case "RELEASE" -> prefix = "REL";
            case "EXPORT" -> prefix = "EXP";
            case "IMPORT" -> prefix = "IMP";
            case "ADJUST" -> prefix = "ADJ";
            default -> prefix = "PK";
        }
        String datePart = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"));
        OffsetDateTime startOfDay = OffsetDateTime.now().toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime endOfDay = startOfDay.plusDays(1);
        long countToday = inventoryTransactionRepository.countByCreatedAtBetween(startOfDay, endOfDay);
        return prefix + "-" + datePart + "-" + (countToday + 1);
    }

    @Transactional
    private void updateVariantStatusInternal(Long variantId, int oldAvailable, int newAvailable) {
        String oldStatus = getStatusFromAvailable(oldAvailable);
        String newStatus = getStatusFromAvailable(newAvailable);

        if (!oldStatus.equals(newStatus)) {
            productServiceClient.changeProductVariantStatus(variantId, newStatus);
        }
    }

    @Transactional
    public void refreshVariantStatus(Long variantId) {
        List<Inventory> inventories = inventoryRepository.findByVariantId(variantId);
        if (inventories.isEmpty()) return;

        int totalAvailable = inventories.stream()
                .mapToInt(inv -> inv.getQuantity() - inv.getReservedQuantity())
                .sum();

        String newStatus = getStatusFromAvailable(totalAvailable);
        productServiceClient.changeProductVariantStatus(variantId, newStatus);
    }

    @Transactional
    public void updateReservedQuantity(Long inventoryId, int newReservedQuantity) {
        Inventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hàng tồn kho!"));

        int oldReserved = inv.getReservedQuantity();
        if (oldReserved == newReservedQuantity) return;
        inv.setReservedQuantity(newReservedQuantity);
        inventoryRepository.save(inv);

        refreshVariantStatus(inv.getVariantId());
    }


    private String getStatusFromAvailable(int available) {
        return available <= 0 ? "OUT_OF_STOCK"
                : available <= 10 ? "LOW_STOCK"
                : "AVAILABLE";
    }

    public Page<InventoryResponse> getInventoriesOrderByAvailableStock(Integer page, Integer size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Inventory> inventories = inventoryRepository.findAllOrderByAvailableStock(pageable);

        Map<Long, VariantResponse> variantMap = productServiceClient
                .getVariantsByIds(inventories.getContent().stream()
                        .map(Inventory::getVariantId)
                        .toList())
                .stream()
                .collect(Collectors.toMap(VariantResponse::getId, v -> v));

        List<InventoryResponse> responses = inventories.getContent().stream()
                .map(i -> new InventoryResponse(
                        i.getId(),
                        Optional.ofNullable(variantMap.get(i.getVariantId())),
                        i.getWarehouse(),
                        i.getQuantity(),
                        i.getReservedQuantity(),
                        i.isActive(),
                        i.getCreatedAt(),
                        i.getUpdatedAt()
                ))
                .toList();

        return new PageImpl<>(responses, pageable, inventories.getTotalElements());
    }

    @Transactional
    public void createTransactionForReturnedDelivery(ReturnedOrderTransactionRequest request) {
        List<InventoryTransaction> exportTxs =
                inventoryTransactionRepository.findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatusAndInventory_Warehouse_Id(
                        "ORDER",
                        request.getOrderNumber(),
                        "EXPORT",
                        "COMPLETED",
                        request.getWarehouseId());
        if (exportTxs.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu xuất kho đã hoàn thành!");

        for (InventoryTransaction exportTx : exportTxs) {
            Inventory inventory = exportTx.getInventory();
            int exportedQty = exportTx.getQuantity();

            InventoryTransaction newTx = new InventoryTransaction(
                    generateTransactionCode("IMPORT"),
                    inventory,
                    "IMPORT",
                    exportedQty,
                    exportTx.getPricePerItem(),
                    request.getNote(),
                    "ORDER",
                    request.getOrderNumber(),
                    request.getShipperId()
            );

            inventoryTransactionRepository.save(newTx);
            updateTransactionStatus(newTx.getId(), "COMPLETED", request.getNote(), request.getShipperId(),"",null);
        }
    }

}
