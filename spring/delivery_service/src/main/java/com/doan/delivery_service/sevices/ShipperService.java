package com.doan.delivery_service.sevices;

import com.doan.delivery_service.dtos.delivery.DeliveryOrderItemResponse;
import com.doan.delivery_service.dtos.delivery.DeliveryOrderResponse;
import com.doan.delivery_service.dtos.shipper.ShipperDetailsResponse;
import com.doan.delivery_service.dtos.shipper.ShipperRequest;
import com.doan.delivery_service.dtos.shipper.ShipperResponse;
import com.doan.delivery_service.enums.DeliveryStatus;
import com.doan.delivery_service.models.DeliveryOrder;
import com.doan.delivery_service.models.DeliveryOrderItem;
import com.doan.delivery_service.models.Shipper;
import com.doan.delivery_service.repositories.DeliveryOrderRepository;
import com.doan.delivery_service.repositories.ShipperRepository;
import com.doan.delivery_service.repositories.feign.AuthRepositoryClient;
import com.doan.delivery_service.repositories.feign.InventoryRepositoryClient;
import com.doan.delivery_service.repositories.feign.OrderRepositoryClient;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class ShipperService {
    private final DeliveryOrderRepository deliveryOrderRepository;
    private final ShipperRepository shipperRepository;
    private final InventoryRepositoryClient inventoryRepositoryClient;
    private final OrderRepositoryClient orderRepositoryClient;
    private final AuthRepositoryClient authRepositoryClient;

    private static final List<DeliveryStatus> ACTIVE_STATUSES = List.of(
            DeliveryStatus.ASSIGNED, DeliveryStatus.SHIPPING, DeliveryStatus.FAILED
    );

    public Page<Shipper> getAllShippers(Integer page, Integer size, String keyword, String status, Long warehouseId, Boolean active) {
        int pageNumber = page != null && page > 0 ? page : 0;
        int pageSize = size != null && size > 0 ? size : 10;
        return shipperRepository.findAllByKeywordAndStatusAndWarehouseId(
                (keyword != null && !keyword.isBlank()) ? keyword : null,
                (status != null && !status.isBlank()) ? status : null,
                (warehouseId != null && warehouseId > 0) ? warehouseId : null,
                active,
                PageRequest.of(pageNumber, pageSize)
        );
    }

    public Page<ShipperDetailsResponse> getAllShippersDetails(Integer page, Integer size, String keyword, String status, Long warehouseId, Boolean active) {
        int pageNumber = page != null && page > 0 ? page : 0;
        int pageSize = size != null && size > 0 ? size : 10;
        Page<Shipper> shipperPage = shipperRepository.findAllByKeywordAndStatusAndWarehouseId(
                (keyword != null && !keyword.isBlank()) ? keyword : null,
                (status != null && !status.isBlank()) ? status : null,
                (warehouseId != null && warehouseId > 0) ? warehouseId : null,
                active,
                PageRequest.of(pageNumber, pageSize)
        );
        return shipperPage.map(this::mapToDetailsResponse);
    }

    public Shipper createShipper(ShipperRequest request) {
        checkRegisterRequest(request);
        Shipper shipper = Shipper.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .warehouseId(request.getWarehouseId())
                .isActive(true)
                .status("OFFLINE")
                .build();
        return shipperRepository.save(shipper);
    }

    public List<Shipper> getShipperByIds(List<Long> ids) {
        return shipperRepository.findAllById(ids);
    }

    public Page<Shipper> getShipperByKeyword(String keyword, String type, Integer page, Integer size) {
        Pageable pageable = PageRequest.of(page, size);

        if (keyword == null || keyword.isEmpty()) {
            return shipperRepository.findAll(pageable);
        }

        switch (type) {
            case "name":
                return shipperRepository.findByFullNameContainingIgnoreCase(keyword, pageable);
            case "email":
                return shipperRepository.findByEmailContainingIgnoreCase(keyword, pageable);
            case "phone":
                return shipperRepository.findByPhoneContaining(keyword, pageable);
            default:
                // Search all fields combined
                List<Shipper> result = new ArrayList<>();
                result.addAll(shipperRepository.findByFullNameContainingIgnoreCase(keyword, pageable).getContent());
                result.addAll(shipperRepository.findByEmailContainingIgnoreCase(keyword, pageable).getContent());
                result.addAll(shipperRepository.findByPhoneContaining(keyword, pageable).getContent());
                return new PageImpl<>(result, pageable, result.size());
        }
    }

    public Shipper getShipperByEmail(String email) {
        return shipperRepository.getShipperByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipper!"));
    }

    public List<ShipperResponse> getShipperByIdLike(Long id) {
        String idPart = String.valueOf(id);
        List<Shipper> customerList = shipperRepository.findByIdLike(idPart);
        return customerList.stream().map(staff ->
                new ShipperResponse(staff.getId(), staff.getFullName(), staff.getEmail(), staff.getPhone(), staff.getCreatedAt())).toList();
    }

    public void deleteShipper(Long id) {
        shipperRepository.deleteById(id);
    }

    @Transactional
    public Shipper updateShipper(Long id, ShipperRequest request) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng với id: " + id));

        if (request.getFullName() != null && !request.getFullName().isBlank() &&
                !request.getFullName().equals(shipper.getFullName())) {
            shipper.setFullName(request.getFullName());
        }

        if (request.getPhone() != null && !request.getPhone().isBlank() &&
                !request.getPhone().equals(shipper.getPhone())) {
            if (shipperRepository.existsByPhone(request.getPhone())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã tồn tại!");
            }
            shipper.setPhone(request.getPhone());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank() &&
                !request.getEmail().equals(shipper.getEmail())) {
            if (shipperRepository.existsByEmail(request.getEmail())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã tồn tại!");
            }
            shipper.setEmail(request.getEmail());
        }

        if (request.getWarehouseId() != null && !request.getWarehouseId().equals(shipper.getWarehouseId())) {
            shipper.setWarehouseId(request.getWarehouseId());
        }
        return shipperRepository.save(shipper);
    }


    public void checkRegisterRequest(ShipperRequest request) {
        if (request.getEmail() != null && !request.getEmail().isEmpty()
                && shipperRepository.existsByEmail(request.getEmail().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email đã được sử dụng!");
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty()
                && shipperRepository.existsByPhone(request.getPhone().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng!");
        }
    }

    public ShipperDetailsResponse getShipperDetailsById(Long id) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipper!"));
        return mapToDetailsResponse(shipper);
    }


    public Shipper updateShipperWarehouse(Long id, Long warehouseId) {
        if (warehouseId == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã kho");
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipper!"));
        try{
            if(!inventoryRepositoryClient.checkWarehouseId(warehouseId))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mã kho không tồn tại!");
        }catch (Exception ex){
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"Lỗi hệ thống khi kiểm tra kho!");
        }
        shipper.setWarehouseId(warehouseId);
        return shipperRepository.save(shipper);
    }

    public Shipper updateShipperActive(Long id,boolean callToAuth) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipper!"));
        shipper.setIsActive(!shipper.getIsActive());
        if(callToAuth){
            try {
                authRepositoryClient.changeAccountActive(id,5L);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống khi khóa tài khoản");
            }
        }
        return shipperRepository.save(shipper);
    }

    @Transactional
    public Shipper updateShipperStatus(Long id, String status) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipper!"));
        if (status == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập trạng thái!");
        if (!status.equals("ONLINE") && !status.equals("OFFLINE"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ!");
        shipper.setStatus(status);

        return shipper;
    }

    private ShipperDetailsResponse mapToDetailsResponse(Shipper shipper) {
        return new ShipperDetailsResponse(shipper.getId(), shipper.getFullName(),
                shipper.getEmail(), shipper.getPhone(), shipper.getCreatedAt(),shipper.getIsActive(),
                shipper.getStatus(), getShipperDeliveries(shipper.getId()));
    }

    public List<DeliveryOrder> getShipperDeliveries(Long shipperId) {
        return deliveryOrderRepository.findByAssignedShipper_IdAndStatusIn(shipperId, ACTIVE_STATUSES);
    }

    public Page<DeliveryOrderResponse> getShipperDeliveriesResponse(
            Long shipperId, Integer page, Integer size, String keyword, String status) {

        Pageable pageable = PageRequest.of(page, size);

        String kw = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();

        Page<DeliveryOrder> result;

        boolean hasStatus = status != null && !status.isBlank();

        if (hasStatus) {
            DeliveryStatus st = DeliveryStatus.valueOf(status.toUpperCase());

            result = deliveryOrderRepository
                    .findByAssignedShipper_IdAndStatusAndDeliveryNumberContainingIgnoreCase(
                            shipperId, st, kw, pageable);

        } else {
            result = deliveryOrderRepository
                    .findByAssignedShipper_IdAndDeliveryNumberContainingIgnoreCase(
                            shipperId, kw, pageable);
        }

        return result.map(this::mapToResponse);
    }



    public Shipper getShipperById(Long id) {
        return shipperRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy shipper!"));
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
                .unitPrice(item.getUnitPrice())
                .quantity(item.getQuantity())
                .imageUrl(item.getImageUrl())
                .build();
    }
}
