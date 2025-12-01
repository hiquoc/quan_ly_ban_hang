package com.doan.inventory_service.services;

import com.doan.inventory_service.dtos.transaction.InventoryTransactionRequest;
import com.doan.inventory_service.dtos.purchase.PurchaseOrderItemResponse;
import com.doan.inventory_service.dtos.purchase.PurchaseOrderRequest;
import com.doan.inventory_service.dtos.purchase.PurchaseOrderResponse;
import com.doan.inventory_service.models.PurchaseOrder;
import com.doan.inventory_service.models.PurchaseOrderItem;
import com.doan.inventory_service.models.Supplier;
import com.doan.inventory_service.models.Warehouse;
import com.doan.inventory_service.repositories.PurchaseOrderItemRepository;
import com.doan.inventory_service.repositories.PurchaseOrderRepository;
import com.doan.inventory_service.repositories.SupplierRepository;
import com.doan.inventory_service.repositories.WarehouseRepository;
import com.doan.inventory_service.services.clients.ProductServiceClient;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.hibernate.cache.spi.support.AbstractReadWriteAccess;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
@AllArgsConstructor
public class PurchaseOrderService {
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final SupplierRepository supplierRepository;
    private final WarehouseRepository warehouseRepository;
    private final InventoryService inventoryService;

    private final ProductServiceClient productServiceClient;

    @Transactional
    public PurchaseOrderResponse createPurchaseOrder(PurchaseOrderRequest request, Long staffId) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp!"));

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy kho!"));
        PurchaseOrder purchaseOrder = new PurchaseOrder(
                generatePurchaseOrderCode(), staffId, staffId, supplier,warehouse, "PENDING");

        List<PurchaseOrderItem> orderItems = request.getItems().stream().map(item -> {
            PurchaseOrderItem poi = new PurchaseOrderItem();
            poi.setPurchaseOrder(purchaseOrder);
            poi.setVariantId(item.getVariantId());
            poi.setQuantity(item.getQuantity());
            poi.setImportPrice(item.getImportPrice());
            poi.setSubtotal(item.getImportPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            return poi;
        }).toList();

        purchaseOrder.setItems(orderItems);

        purchaseOrder.setTotalAmount(orderItems.stream()
                .map(PurchaseOrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        purchaseOrderRepository.save(purchaseOrder);
        return toResponse(purchaseOrder);
    }

    @Transactional
    public PurchaseOrderResponse updatePurchaseOrder(Long id, PurchaseOrderRequest request, Long staffId) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn nhập hàng với id: " + id));

        if (!"PENDING".equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Không được phép chỉnh sửa đơn nhập hàng đã hoàn tất!");
        }

        if (!Objects.equals(order.getSupplier().getId(), request.getSupplierId())) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy nhà cung cấp!"));
            order.setSupplier(supplier);
        }
        if (!Objects.equals(order.getSupplier().getId(), request.getSupplierId())) {
            Warehouse warehouse = warehouseRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy kho!"));
            order.setWarehouse(warehouse);
        }

        if (!Objects.equals(staffId, order.getUpdatedBy())) {
            order.setUpdatedBy(staffId);
        }

        order.getItems().clear();
        List<PurchaseOrderItem> newItems = request.getItems().stream().map(item -> {
            PurchaseOrderItem poi = new PurchaseOrderItem();
            poi.setPurchaseOrder(order);
            poi.setVariantId(item.getVariantId());
            poi.setQuantity(item.getQuantity());
            poi.setImportPrice(item.getImportPrice());
            poi.setSubtotal(item.getImportPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            return poi;
        }).toList();
        order.getItems().addAll(newItems);
        order.setTotalAmount(newItems.stream()
                .map(PurchaseOrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        return toResponse(order);
    }

    @Transactional
    public PurchaseOrderResponse updatePurchaseOrderStatus(Long id, String status, Long staffId,String role,Long staffWarehouseId) {
        if (!"COMPLETED".equals(status) && !"CANCELLED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ!");
        }

        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn nhập hàng với id: " + id));

        if(role.equals("STAFF")&&!Objects.equals(order.getWarehouse().getId(), staffWarehouseId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Bạn không có quyền cập nhật đơn!");

        if (!"PENDING".equals(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ có thể thay đổi trạng thái của đơn đang chờ!");
        }
        if("COMPLETED".equals(status)){
            List<InventoryTransactionRequest> requestList=order.getItems().stream().map(
                    item->new InventoryTransactionRequest(
                            item.getVariantId(),
                            order.getWarehouse().getId(),
                            "IMPORT",
                            item.getQuantity(),
                            item.getImportPrice(),
                            "PURCHASE_ORDER",
                            order.getCode()
                    )
            ).toList();
            try {
                inventoryService.createTransactions(requestList, staffId);
            } catch (ResponseStatusException ex) {
                throw new ResponseStatusException(ex.getStatusCode(),
                        "Lỗi khi tạo giao dịch kho: " + ex.getReason(), ex);
            }
        }
        order.setUpdatedBy(staffId);
        order.setStatus(status);
        return toResponse(order);
    }

    public Page<PurchaseOrderResponse> getPurchaseOrders(
            Integer page, Integer size, String status, String keyword, Long warehouseId, OffsetDateTime start, OffsetDateTime end) {

        Pageable pageable = PageRequest.of(
                page != null ? page : 0,
                size != null ? size : 20,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (warehouseId != null) {
                predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (keyword != null && !keyword.isBlank()) {
                String likeKeyword = "%" + keyword.trim().toLowerCase() + "%";

                List<Predicate> keywordPredicates = new ArrayList<>();

                keywordPredicates.add(cb.like(
                        cb.function("unaccent", String.class, cb.lower(root.get("code"))),
                        cb.function("unaccent", String.class, cb.literal(likeKeyword))
                ));

                keywordPredicates.add(cb.like(
                        cb.function("unaccent", String.class, cb.lower(root.get("supplier").get("code"))),
                        cb.function("unaccent", String.class, cb.literal(likeKeyword))
                ));

                List<Long> variantIds = productServiceClient.searchVariantIds(keyword);
                if (!variantIds.isEmpty()) {
                    Join<PurchaseOrder, AbstractReadWriteAccess.Item> itemJoin = root.join("items", JoinType.INNER);
                    Predicate variantPredicate = itemJoin.get("variantId").in(variantIds);
                    keywordPredicates.add(variantPredicate);
                }

                Predicate keywordPredicate = cb.or(keywordPredicates.toArray(new Predicate[0]));
                predicates.add(keywordPredicate);
            }

            if (start != null && end != null) {
                predicates.add(cb.between(root.get("createdAt"), start, end));
            } else if (start != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
            } else if (end != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), end));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<PurchaseOrder> ordersPage = purchaseOrderRepository.findAll(spec, pageable);

        return ordersPage.map(this::toResponse);
    }

    public Boolean checkPurchaseOrderByVariantId(Long id){
        return purchaseOrderItemRepository.existsByVariantId(id);
    }


    @Transactional
    public PurchaseOrderResponse toResponse(PurchaseOrder order) {
        List<PurchaseOrderItemResponse> items = order.getItems().stream()
                .map(i -> new PurchaseOrderItemResponse(
                        i.getId(),
                        i.getVariantId(),
                        i.getQuantity(),
                        i.getImportPrice()
                )).toList();

        return new PurchaseOrderResponse(
                order.getId(),
                order.getCode(),
                order.getSupplier(),
                order.getWarehouse(),
                order.getStatus(),
                order.getCreatedBy(),
                order.getUpdatedBy(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                items,
                order.getTotalAmount()
        );
    }
    public String generatePurchaseOrderCode() {
        String datePart = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"));
        long countToday = purchaseOrderRepository.countByCreatedAtBetween(
                OffsetDateTime.now().toLocalDate().atStartOfDay().atOffset(ZoneOffset.UTC),
                OffsetDateTime.now().toLocalDate().plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC) );
        return "NH-" + datePart + "-" + (countToday + 1);
    }
}
