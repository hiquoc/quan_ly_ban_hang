package com.doan.inventory_service.services;

import com.doan.inventory_service.dtos.inventory.*;
import com.doan.inventory_service.dtos.order.UpdateOrderStatusFromInvRequest;
import com.doan.inventory_service.dtos.transaction.*;
import com.doan.inventory_service.models.*;
import com.doan.inventory_service.repositories.*;
import com.doan.inventory_service.services.clients.OrderServiceClient;
import com.doan.inventory_service.services.clients.ProductServiceClient;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

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
    public Page<InventoryResponse> searchInventories(String keyword, Integer page, Integer size) {
        Pageable pageable = (page == null || size == null)
                ? Pageable.unpaged()
                : PageRequest.of(page, size, Sort.by("createdAt").descending());

        List<Long> variantIds = null;
        String warehouseKeyword = null;

        if (keyword != null && !keyword.isBlank()) {
            try {
                variantIds = productServiceClient.searchVariantIds(keyword);
                if (variantIds.isEmpty()) variantIds = null;
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi tìm variant", e);
            }
            warehouseKeyword = "%" + keyword.toLowerCase() + "%";
        }

        Page<Inventory> inventory = inventoryRepository.searchInventories(variantIds, warehouseKeyword, pageable);

        Map<Long, Object> variantMap = new HashMap<>();
        List<InventoryResponse> responses = inventory.getContent().stream().map(i -> {
            Object variant = variantMap.computeIfAbsent(i.getVariantId(), id -> {
                try {
                    return productServiceClient.getProductVariantFromInternal(id);
                } catch (Exception e) {
                    return "Error";
                }
            });
            return new InventoryResponse(
                    i.getId(),
                    variant,
                    i.getWarehouse(),
                    i.getQuantity(),
                    i.getReservedQuantity(),
                    i.getCreatedAt(),
                    i.getUpdatedAt()
            );
        }).toList();

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
                        null,
                        null)
        ).toList();
    }

    public void changeItemActive(Long id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm!"));
        inventory.setActive(!inventory.isActive());
        inventoryRepository.save(inventory);
    }

    // ---------------------- RESERVE / RELEASE STOCK ----------------------
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reserveStock(ReserveStockRequest request) {
        List<Inventory> inventories = inventoryRepository.findByVariantId(request.getVariantId());
        int pending = request.getQuantity();

        int totalAvailable = inventories.stream()
                .mapToInt(inv -> inv.getQuantity() - inv.getReservedQuantity())
                .sum();

        if (totalAvailable < pending) {
            throw new RuntimeException("Không đủ sản phẩm trong kho để đặt giữ");
        }

        for (Inventory inv : inventories) {
            int available = inv.getQuantity() - inv.getReservedQuantity();
            if (available <= 0) continue;

            int add = Math.min(pending, available);
            inv.setReservedQuantity(inv.getReservedQuantity() + add);
            inventoryRepository.save(inv);

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
    }

    @Transactional
    public void releaseStock(String orderNumber, String reason) {
        List<InventoryTransaction> reserves = inventoryTransactionRepository
                .findByReferenceTypeAndReferenceCodeAndTransactionTypeAndStatus(
                        "ORDER", orderNumber, "RESERVE", "PENDING");

        for (InventoryTransaction reserve : reserves) {
            Inventory inv = reserve.getInventory();
            int quantity = reserve.getQuantity();

            int newReserved = inv.getReservedQuantity() - quantity;
            if (newReserved < 0) newReserved = 0;
            inv.setReservedQuantity(newReserved);
            inventoryRepository.save(inv);

            updateVariantStatusInternal(inv.getVariantId(),
                    inv.getQuantity() - (inv.getReservedQuantity() + quantity),
                    inv.getQuantity() - inv.getReservedQuantity()
            );

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
    public void createOrderTransaction(OrderTransactionRequest request) {
        for (OrderItemTransactionRequest orderItem : request.getOrderItems()) {
            List<Inventory> inventories = inventoryRepository.findByVariantId(orderItem.getVariantId());
            if (inventories.isEmpty())
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm để tạo đơn hàng!");

            int pending = orderItem.getQuantity();

            for (Inventory inv : inventories) {
                if (pending <= 0) break;

                int exportQty = Math.min(inv.getQuantity(), pending);

                InventoryTransaction inventoryTransaction = InventoryTransaction.builder()
                        .code(generateTransactionCode("EXPORT"))
                        .inventory(inv)
                        .transactionType("EXPORT")
                        .quantity(exportQty)
                        .pricePerItem(orderItem.getPricePerItem())
                        .referenceType("ORDER")
                        .referenceCode(request.getOrderNumber())
                        .status("PENDING")
                        .createdBy(request.getStaffId())
                        .build();
                inventoryTransactionRepository.save(inventoryTransaction);

                pending -= exportQty;
            }

            if (pending > 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đủ sản phẩm để tạo đơn hàng!");
        }
    }


    @Transactional
    public void createTransactions(List<InventoryTransactionRequest> requestList, Long staffId) {
        for (InventoryTransactionRequest request : requestList) {
            Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kho!"));
            if (!"ADJUST".equals(request.getTransactionType()) &&
                    request.getReferenceType() != null && request.getReferenceCode() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng điền đầy đủ thông tin!");
            }

            Inventory inventory = inventoryRepository.findByVariantIdAndWarehouseId(
                            request.getVariantId(),
                            request.getWarehouseId())
                    .orElseGet(() -> Inventory.builder()
                            .variantId(request.getVariantId())
                            .warehouse(warehouse)
                            .quantity(0)
                            .reservedQuantity(0)
                            .build());

            inventoryRepository.save(inventory);

            InventoryTransaction inventoryTransaction = new InventoryTransaction(
                    generateTransactionCode(request.getTransactionType()),
                    inventory,
                    request.getTransactionType(),
                    Math.abs(request.getQuantity()),
                    request.getPricePerItem(),
                    request.getNote(),
                    request.getReferenceType(),
                    request.getReferenceCode(),
                    staffId
            );
            inventoryTransactionRepository.save(inventoryTransaction);

            if ("EXPORT".equals(request.getTransactionType())) {
                int available = inventory.getQuantity() - inventory.getReservedQuantity();
                if (available < request.getQuantity()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng sản phẩm trong kho không đủ!");
                }
                updateReservedQuantity(inventory.getId(), inventory.getReservedQuantity() + request.getQuantity());
            }
        }
    }

    @Transactional
    public void updateTransactionStatus(Long id, String status, Long staffId) {
        InventoryTransaction transaction = inventoryTransactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không tìm thấy phiếu!"));

        if ("RESERVE".equals(transaction.getTransactionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không được phép chỉnh sửa phiếu này!");
        }

        Inventory inventory = transaction.getInventory();
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
                        productServiceClient.updateVariantImportPrice(inventory.getVariantId(), transaction.getPricePerItem());
                    }
                }
                case "ADJUST" -> {
                    newQuantity = oldQuantity + transaction.getQuantity();
                    if (newQuantity < 0)
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng hàng trong kho không đủ!");
                    inventory.setQuantity(newQuantity);
                }
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại giao dịch không hợp lệ! " + transaction.getTransactionType());
            }

            // Only update variant status if it actually changed
            refreshVariantStatus(inventory.getVariantId());
        }
        else if ("CANCELLED".equals(status)) {
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

        transaction.setUpdatedBy(staffId);
        inventoryRepository.save(inventory);

        transaction.setStatus(status);
        inventoryTransactionRepository.save(transaction);
        if (transaction.getReferenceType() != null && transaction.getReferenceType().equals("ORDER")) {
            String orderNumber = transaction.getReferenceCode();

            UpdateOrderStatusFromInvRequest orderUpdateRequest = new UpdateOrderStatusFromInvRequest(
                    staffId,
                    "COMPLETED".equals(status) ? 4L : // 4 = shipped
                            "CANCELLED".equals(status) ? 6L : null,
                    "Auto update from inventory transaction " + transaction.getCode()
            );

            if (orderUpdateRequest.getStatusId() != null) {
                try {
                    orderServiceClient.updateOrderStatus(orderNumber, orderUpdateRequest);
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
            String keywordType
    ) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<InventoryTransaction> cq = cb.createQuery(InventoryTransaction.class);
        Root<InventoryTransaction> root = cq.from(InventoryTransaction.class);

        List<Predicate> predicates = new ArrayList<>();

        // Basic filters
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

        Join<InventoryTransaction, Inventory> inventoryJoin = root.join("inventory", JoinType.LEFT);
        Join<Inventory, Warehouse> warehouseJoin = inventoryJoin.join("warehouse", JoinType.LEFT);

        if (keyword != null && !keyword.isBlank() && keywordType != null && !keywordType.isBlank()) {
            switch (keywordType) {
                case "ma_phieu":
                    predicates.add(cb.like(cb.lower(root.get("code")), "%" + keyword.toLowerCase() + "%"));
                    break;
                case "ma_kho":
                    predicates.add(cb.like(cb.lower(warehouseJoin.get("code")), "%" + keyword.toLowerCase() + "%"));
                    break;
                case "ma_sku":
                    List<Long> variantIds = productServiceClient.searchVariantIds(keyword);
                    if (!variantIds.isEmpty()) {
                        predicates.add(inventoryJoin.get("variantId").in(variantIds));
                    } else {
                        return new PageImpl<>(Collections.emptyList(), PageRequest.of(page, size), 0);
                    }
                    break;
            }
        }

        cq.where(predicates.toArray(new Predicate[0]));
        cq.orderBy(cb.desc(root.get("createdAt")));

        TypedQuery<InventoryTransaction> query = em.createQuery(cq)
                .setFirstResult(page * size)
                .setMaxResults(size);

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<InventoryTransaction> countRoot = countQuery.from(InventoryTransaction.class);
        Join<InventoryTransaction, Inventory> countInventoryJoin = countRoot.join("inventory", JoinType.LEFT);
        Join<Inventory, Warehouse> countWarehouseJoin = countInventoryJoin.join("warehouse", JoinType.LEFT);

        List<Predicate> countPredicates = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            countPredicates.add(cb.equal(countRoot.get("status"), status));
        }
        if (type != null && !type.isBlank()) {
            countPredicates.add(cb.equal(countRoot.get("transactionType"), type));
        }
        if (startDate != null) {
            countPredicates.add(cb.greaterThanOrEqualTo(countRoot.get("createdAt"), startDate));
        }
        if (endDate != null) {
            countPredicates.add(cb.lessThanOrEqualTo(countRoot.get("createdAt"), endDate));
        }
        if (keyword != null && !keyword.isBlank() && keywordType != null && !keywordType.isBlank()) {
            switch (keywordType) {
                case "ma_phieu":
                    countPredicates.add(cb.like(cb.lower(countRoot.get("code")), "%" + keyword.toLowerCase() + "%"));
                    break;
                case "ma_kho":
                    countPredicates.add(cb.like(cb.lower(countWarehouseJoin.get("code")), "%" + keyword.toLowerCase() + "%"));
                    break;
                case "ma_sku":
                    List<Long> countVariantIds = productServiceClient.searchVariantIds(keyword);
                    if (!countVariantIds.isEmpty()) {
                        countPredicates.add(countInventoryJoin.get("variantId").in(countVariantIds));
                    } else {
                        return new PageImpl<>(Collections.emptyList(), PageRequest.of(page, size), 0);
                    }
                    break;
            }
        }


        countQuery.select(cb.count(countRoot))
                .where(countPredicates.toArray(new Predicate[0]));

        Long total = em.createQuery(countQuery).getSingleResult();
        List<InventoryTransaction> resultList = query.getResultList();
        return new PageImpl<>(transactionResponseMapper(resultList), PageRequest.of(page, size), total);
    }



    public Page<InventoryTransactionResponse> getTransaction(
            Long id, Integer page, Integer size, LocalDate fromDate, LocalDate toDate) {

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'Đến ngày' không thể bé hơn 'Từ ngày'");

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm món hàng!"));

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

    @Transactional
    private List<InventoryTransactionResponse> transactionResponseMapper(List<InventoryTransaction> list) {
        Map<Long, Object> variantMap = new HashMap<>();
        return list.stream().map(it -> {
            Object variant = variantMap.computeIfAbsent(it.getInventory().getVariantId(), id -> {
                try {
                    return productServiceClient.getProductVariantFromInternal(it.getInventory().getVariantId());
                } catch (Exception e) {
                    return "Error";
                }
            });
            return InventoryTransactionResponse.builder()
                    .id(it.getId())
                    .variant(variant)
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
                    .build();
        }).toList();
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
}
