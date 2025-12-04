package com.doan.delivery_service.sevices;

import com.doan.delivery_service.dtos.delivery.*;
import com.doan.delivery_service.dtos.inventory.OrderItemTransactionRequest;
import com.doan.delivery_service.dtos.inventory.OrderTransactionRequest;
import com.doan.delivery_service.dtos.inventory.ReturnedOrderTransactionRequest;
import com.doan.delivery_service.dtos.order.UpdateOrderStatusRequest;
import com.doan.delivery_service.enums.DeliveryStatus;
import com.doan.delivery_service.models.DeliveryOrder;
import com.doan.delivery_service.models.DeliveryOrderItem;
import com.doan.delivery_service.models.Shipper;
import com.doan.delivery_service.repositories.DeliveryOrderRepository;
import com.doan.delivery_service.repositories.ShipperRepository;
import com.doan.delivery_service.repositories.feign.InventoryRepositoryClient;
import com.doan.delivery_service.repositories.feign.OrderRepositoryClient;
import com.doan.delivery_service.sevices.cloud.CloudinaryService;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class DeliveryOrderService {
    private final DeliveryOrderRepository deliveryOrderRepository;
    private final ShipperRepository shipperRepository;
    private final InventoryRepositoryClient inventoryRepositoryClient;
    private final OrderRepositoryClient orderRepositoryClient;
    private final CloudinaryService cloudinaryService;

    private static final List<DeliveryStatus> ACTIVE_STATUSES = List.of(
            DeliveryStatus.ASSIGNED, DeliveryStatus.SHIPPING,DeliveryStatus.FAILED
    );
    private static final List<DeliveryStatus> ALLOW_REASSIGN_STATUSES = List.of(
            DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED,DeliveryStatus.FAILED
    );


    public Page<DeliveryOrderResponse> getAllDeliveryOrders(Integer page, Integer size, String keyword, String status, Long warehouseId) {
        Page<DeliveryOrder> data= deliveryOrderRepository.findAllByKeywordAndWarehouseId(
                (keyword != null && !keyword.isBlank()) ? keyword : null,
                (status != null && !status.isBlank()) ? status : null,
                (warehouseId != null && warehouseId > 0) ? warehouseId : null,
                PageRequest.of(page, size));
        return data.map(this::mapToResponse);
    }

    @Transactional
    public void createDeliveryOrder(DeliveryOrderRequest request) {
        DeliveryOrder deliveryOrder = DeliveryOrder.builder()
                .deliveryNumber(generateDeliveryNumber())
                .orderId(request.getOrderId())
                .orderNumber(request.getOrderNumber())
                .shippingName(request.getShippingName())
                .shippingAddress(request.getShippingAddress())
                .shippingPhone(request.getShippingPhone())
                .paymentMethod(request.getPaymentMethod())
                .warehouseId(request.getWarehouseId())
                .status(DeliveryStatus.PENDING)
                .codAmount(request.getCodAmount())
                .build();
        deliveryOrder.setItemList(request.getItemList().stream().map(
                it -> DeliveryOrderItem.builder()
                        .deliveryOrder(deliveryOrder)
                        .orderItemId(it.getOrderItemId())
                        .variantId(it.getVariantId())
                        .variantName(it.getVariantName())
                        .unitPrice(it.getUnitPrice())
                        .imageUrl(it.getImageUrl())
                        .quantity(it.getQuantity())
                        .build()
        ).toList());
        deliveryOrderRepository.save(deliveryOrder);
    }

    public void deleteDeliveryOrder(Long id) {
        deliveryOrderRepository.deleteById(id);
    }

    public String generateDeliveryNumber() {
        String prefix = "GH";
        String datePart = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"));

        OffsetDateTime startOfDay = OffsetDateTime.now()
                .toLocalDate()
                .atStartOfDay()
                .atOffset(ZoneOffset.UTC);
        OffsetDateTime endOfDay = startOfDay.plusDays(1);

        long countToday = deliveryOrderRepository.countByCreatedAtBetween(startOfDay, endOfDay);

        return prefix + "-" + datePart + "-" + (countToday + 1);
    }

    @Transactional
    public List<DeliveryOrderResponse> assignDeliveryOrders(AssignDeliveryOrderRequest request) {
        Shipper newShipper = shipperRepository.findById(request.getShipperId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy shipper với id: " + request.getShipperId()));

        if (!Boolean.TRUE.equals(newShipper.getIsActive()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shipper đang bị khóa!");

        if (!"ONLINE".equals(newShipper.getStatus()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shipper không thể nhận đơn hàng lúc này!");

        long activeCount = deliveryOrderRepository.countByAssignedShipper_IdAndStatusIn(
                newShipper.getId(), ACTIVE_STATUSES
        );
        int MAX_ALLOWED = 10;
        if (activeCount >= MAX_ALLOWED)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Shipper đang có quá nhiều đơn hoạt động!");

        List<DeliveryOrder> ordersToSave = new ArrayList<>();
        List<Shipper> oldShippersToSave = new ArrayList<>();

        for (Long deliveryId : request.getDeliveryIds()) {

            DeliveryOrder order = deliveryOrderRepository.findById(deliveryId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Không tìm thấy đơn giao hàng với id: " + deliveryId));

            if (!ALLOW_REASSIGN_STATUSES.contains(order.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gán đơn giao hàng không hợp lệ!");
            }
            if (!Objects.equals(order.getWarehouseId(), newShipper.getWarehouseId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Kho đơn hàng và shipper không trùng nhau!");
            }

            if (order.getAssignedShipper() != null) {
                Shipper oldShipper = order.getAssignedShipper();

                oldShipper.getAssignedOrders()
                        .removeIf(o -> Objects.equals(o.getId(), deliveryId));

                oldShippersToSave.add(oldShipper);
            }

            order.setAssignedShipper(newShipper);
            order.setAssignedAt(OffsetDateTime.now());
            if(order.getStatus()!=DeliveryStatus.FAILED)
                changeDeliveryOrderStatus(order,DeliveryStatus.ASSIGNED ,null,null);

            ordersToSave.add(order);
        }

        shipperRepository.saveAll(oldShippersToSave);
        deliveryOrderRepository.saveAll(ordersToSave);

        return deliveryOrderRepository
                .findByAssignedShipper_IdAndStatusIn(newShipper.getId(), ACTIVE_STATUSES)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }
    @Transactional
    public void autoAssignDeliveryOrders() {
        int MAX_ALLOWED = 10;
        List<DeliveryOrder> ordersToSave = new ArrayList<>();

        List<DeliveryOrder> pendingOrders = deliveryOrderRepository.findByStatus(DeliveryStatus.PENDING);
        if (pendingOrders.isEmpty()) return;

        List<Object[]> shipperData = shipperRepository.getAllActiveShippersWithOrderCounts();
        if (shipperData.isEmpty()) return;

        Map<Long, Map<Shipper, Integer>> shipperMapByWarehouse = new HashMap<>();
        for (Object[] row : shipperData) {
            Shipper shipper = (Shipper) row[0];
            Integer count = ((Number) row[1]).intValue();
            Long warehouseId = shipper.getWarehouseId();
            shipperMapByWarehouse.computeIfAbsent(warehouseId, k -> new HashMap<>())
                    .put(shipper, count);
        }

        for (DeliveryOrder order : pendingOrders) {
            Map<Shipper, Integer> shippersInWarehouse = shipperMapByWarehouse.get(order.getWarehouseId());

            if (shippersInWarehouse == null || shippersInWarehouse.isEmpty()) {
                continue;
            }

            Optional<Shipper> shipperOpt = shippersInWarehouse.entrySet().stream()
                    .filter(entry -> entry.getValue() < MAX_ALLOWED)
                    .min(Comparator.comparingInt(Map.Entry::getValue))
                    .map(Map.Entry::getKey);

            if (shipperOpt.isEmpty()) {
                continue;
            }

            Shipper shipper = shipperOpt.get();

            order.setAssignedShipper(shipper);
            order.setAssignedAt(OffsetDateTime.now());
            changeDeliveryOrderStatus(order, DeliveryStatus.ASSIGNED, null, null);
            ordersToSave.add(order);

            shippersInWarehouse.put(shipper, shippersInWarehouse.get(shipper) + 1);
        }

        deliveryOrderRepository.saveAll(ordersToSave);
    }



    @Transactional
    public void handleChangeDeliveryOrderStatus(ChangeDeliveryOrderStatusRequest request, Long shipperId) {
        DeliveryOrder order = deliveryOrderRepository.findById(request.getDeliveryId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn giao hàng với id: " + request.getDeliveryId()));
        if(order.getStatus()==request.getStatus())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Trạng thái không hợp lệ!");
        if(!order.getAssignedShipper().getId().equals(shipperId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bạn không có quyền cập nhật trạng thái!");
        changeDeliveryOrderStatus(order, request.getStatus(),request.getReason(),request.getImage());
    }
    @Transactional
    public void handleCancelDeliveryOrderStatusFromInternal(CancelDeliveryOrderRequest request) {
        List<DeliveryOrder> orders = deliveryOrderRepository.findByOrderId(request.getOrderId());
        if(orders.isEmpty())
            throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn giao hàng với orderId: " + request.getOrderId());
        for(DeliveryOrder order:orders){
            changeDeliveryOrderStatus(order, DeliveryStatus.CANCELLED, request.getReason(),null);
        }
    }

    private void changeDeliveryOrderStatus(DeliveryOrder order, DeliveryStatus newStatus, String reason, MultipartFile image) {
        DeliveryStatus currentStatus = order.getStatus();
        Shipper shipper= order.getAssignedShipper();
        if (!canChangeStatus(currentStatus, newStatus)) {
            throw new IllegalStateException("Không thể thay đổi trạng thái từ "
                    + currentStatus + " sang " + newStatus);
        }
        if(newStatus==DeliveryStatus.PENDING){
            if(shipper!=null){
                shipper.getAssignedOrders()
                        .removeIf(o -> Objects.equals(o.getId(), order.getOrderId()));
                shipperRepository.save(shipper);
            }
        }
        if(newStatus==DeliveryStatus.SHIPPING && currentStatus!=DeliveryStatus.FAILED){
            try {
                orderRepositoryClient.updateOrderStatus(
                        new UpdateOrderStatusRequest(List.of(order.getOrderNumber()),
                                shipper.getId(), 4L, "Đơn hàng đang được giao bởi SP" + shipper.getId()));
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Lỗi khi tạo phiếu cập nhật trạng thái thành Đã giao cho shipper! " + e.getMessage(), e);
            }
            OrderTransactionRequest request = OrderTransactionRequest.builder()
                            .orderNumber(order.getOrderNumber())
                            .note("Phiếu xuất kho tạo bởi SP +"+shipper.getId())
                            .shipperId(shipper.getId())
                            .orderItems(order.getItemList().stream()
                                    .map(it -> OrderItemTransactionRequest.builder()
                                            .variantId(it.getVariantId())
                                            .pricePerItem(it.getUnitPrice())
                                            .quantity(it.getQuantity())
                                            .build())
                                    .toList())
                            .build();
            try {
                inventoryRepositoryClient.createOrderTransaction(List.of(request));
            } catch (Exception e) {
                try {
                    System.out.println("Tạo phiếu xuất kho thất bại!\nĐang hoàn tác cập nhật trạng thái đơn hàng");
                    orderRepositoryClient.updateOrderStatus(
                            new UpdateOrderStatusRequest(List.of(order.getOrderNumber()),
                                    shipper.getId(), 3L, null));
                } catch (Exception ex) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                            "Lỗi khi hoàn tác cập nhật trạng thái thành Đã giao cho shipper! " + ex.getMessage(), ex);
                }
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Lỗi khi tạo phiếu xuất kho cho shipper! " + e.getMessage(), e);
            }
        }
        if(newStatus==DeliveryStatus.CANCELLED){
            try {
                order.setFailedReason(reason==null?"":reason);
                if(currentStatus==DeliveryStatus.SHIPPING ||currentStatus==DeliveryStatus.FAILED)
                    inventoryRepositoryClient.createReturnOrderTransaction(
                        new ReturnedOrderTransactionRequest(order.getOrderNumber(),order.getAssignedShipper().getId(),
                                DeliveryStatus.CANCELLED.toString(),"Phiếu trả hàng tạo bởi shipper",order.getWarehouseId()));
            }catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Lỗi khi tạo phiếu trả hàng cho shipper! " + e.getMessage(), e);
            }
        }
        if (newStatus == DeliveryStatus.DELIVERED) {
            if (image == null)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Vui lòng chụp ảnh xác nhận!");

            try {
                String imageUrl = cloudinaryService.uploadFile(image);
                order.setDeliveredImageUrl(imageUrl);
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Lỗi khi upload hình ảnh xác thực đơn giao hàng\nVui lòng lưu lại ảnh để xác thực sau!");
            }

            order.setDeliveredAt(OffsetDateTime.now());
            Long shipperId = order.getAssignedShipper().getId();

            List<DeliveryOrder> deliveryOrders =
                    deliveryOrderRepository.findByOrderId(order.getOrderId());

            boolean hasOtherUndelivered = deliveryOrders.stream()
                    .filter(o -> !o.getId().equals(order.getId()))
                    .anyMatch(o -> o.getStatus() != DeliveryStatus.DELIVERED);

            if (!hasOtherUndelivered) {
                try {
                    orderRepositoryClient.updateOrderStatus(
                            new UpdateOrderStatusRequest(
                                    List.of(order.getOrderNumber()),
                                    shipperId,
                                    5L,
                                    "Giao hàng thành công bởi SP" + shipperId));
                } catch (Exception e) {
                    throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                            "Lỗi khi tạo phiếu cập nhật trạng thái thành Đã giao cho shipper! " + e.getMessage(), e);
                }
            }
        }
        order.setStatus(newStatus);
    }

    private boolean canChangeStatus(DeliveryStatus current, DeliveryStatus target) {
        return allowedTransitions().getOrDefault(current, Set.of()).contains(target);
    }
    private Map<DeliveryStatus, Set<DeliveryStatus>> allowedTransitions() {
        Map<DeliveryStatus, Set<DeliveryStatus>> map = new EnumMap<>(DeliveryStatus.class);
        map.put(DeliveryStatus.PENDING, Set.of(DeliveryStatus.ASSIGNED, DeliveryStatus.CANCELLED));
        map.put(DeliveryStatus.ASSIGNED, Set.of(DeliveryStatus.PENDING,DeliveryStatus.CANCELLED,DeliveryStatus.SHIPPING));
        map.put(DeliveryStatus.SHIPPING, Set.of(DeliveryStatus.DELIVERED, DeliveryStatus.FAILED, DeliveryStatus.CANCELLED));
        map.put(DeliveryStatus.DELIVERED, Set.of());
        map.put(DeliveryStatus.FAILED, Set.of(DeliveryStatus.ASSIGNED,DeliveryStatus.SHIPPING, DeliveryStatus.CANCELLED));
        map.put(DeliveryStatus.CANCELLED, Set.of());
        return map;
    }
    private DeliveryOrderResponse mapToResponse(DeliveryOrder order) {
        if (order == null) return null;

        return DeliveryOrderResponse.builder()
                .id(order.getId())
                .deliveryNumber(order.getDeliveryNumber())
                .orderId(order.getOrderId())
                .orderNumber(order.getOrderNumber())
                .shippingName(order.getShippingName())
                .shippingAddress(order.getShippingAddress())
                .shippingPhone(order.getShippingPhone())
                .paymentMethod(order.getPaymentMethod())
                .warehouseId(order.getWarehouseId())
                .status(order.getStatus())
                .assignedShipperId(order.getAssignedShipper() != null ? order.getAssignedShipper().getId() : null)
                .assignedAt(order.getAssignedAt())
                .deliveredAt(order.getDeliveredAt())
                .imageUrl(order.getDeliveredImageUrl())
                .failedReason(order.getFailedReason())
                .codAmount(order.getCodAmount())
                .itemList(order.getItemList() != null
                        ? order.getItemList().stream()
                        .map(this::mapToItemResponse)
                        .toList()
                        : null)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private DeliveryOrderItemResponse mapToItemResponse(DeliveryOrderItem item) {
        if (item == null) return null;

        return DeliveryOrderItemResponse.builder()
                .id(item.getId())
                .orderItemId(item.getOrderItemId())
                .variantId(item.getVariantId())
                .variantName(item.getVariantName())
                .sku(item.getSku())
                .unitPrice(item.getUnitPrice())
                .quantity(item.getQuantity())
                .imageUrl(item.getImageUrl())
                .build();
    }

    @Transactional
    public void cancellingAssignedDeliveryOrder(Long id, Long shipperId) {
        DeliveryOrder order = deliveryOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn giao hàng với id: " + id));
        Long assignedShipperId=order.getAssignedShipper().getId();
        if(assignedShipperId==null || !assignedShipperId.equals(shipperId)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể hủy nhận đơn hàng này!");
        }
        DeliveryStatus currentStatus=order.getStatus();
        if(currentStatus!=DeliveryStatus.ASSIGNED&&currentStatus!=DeliveryStatus.FAILED)
            throw  new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể hủy nhận đơn hàng này!");
        order.setAssignedShipper(null);
        order.setStatus(DeliveryStatus.PENDING);
        order.setAssignedAt(null);
    }
}
