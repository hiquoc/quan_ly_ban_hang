package com.doan.delivery_service.controllers;

import com.doan.delivery_service.dtos.ApiResponse;
import com.doan.delivery_service.dtos.delivery.*;
import com.doan.delivery_service.models.DeliveryOrder;
import com.doan.delivery_service.sevices.DeliveryOrderService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("")
@AllArgsConstructor
public class DeliveryOrderController {
    private final DeliveryOrderService deliveryOrderService;

    @GetMapping("/secure/deliveries")
    public ResponseEntity<?> getAllDeliveries(@RequestParam(required = false) Integer page,
                                                                                    @RequestParam(required = false) Integer size,
                                                                                    @RequestParam(required = false) String keyword,
                                                                                    @RequestParam(required = false) String status,
                                                                                    @RequestParam(required = false) Long warehouseId){
        return ResponseEntity.ok(
                new ApiResponse<>("Lấy dữ liệu thành công!",true, deliveryOrderService.getAllDeliveryOrders(page,size,keyword,status,warehouseId)));
    }

    @PostMapping("/secure/deliveries")
    public ResponseEntity<?> assignDeliveryOrders(@RequestBody @Valid AssignDeliveryOrderRequest request){
        return ResponseEntity.ok(
                new ApiResponse<>("Cập nhật  thành công!",true,deliveryOrderService.assignDeliveryOrders(request)));
    }
    @PatchMapping("/secure/deliveries/{id}")
    public void cancellingAssignedDeliveryOrder(@PathVariable Long id,
                                                @RequestHeader("X-Owner-Id") Long shipperId){
        deliveryOrderService.cancellingAssignedDeliveryOrder(id,shipperId);
    }

        @PutMapping(path = "/secure/deliveries", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public void changeDeliveryOrderStatus( @ModelAttribute @Valid ChangeDeliveryOrderStatusRequest request,
                                          @RequestHeader("X-Owner-Id") Long shipperId){
        deliveryOrderService.handleChangeDeliveryOrderStatus(request,shipperId);
    }

    @PostMapping("/internal/deliveries/cancel")
    public void cancelDeliveryOrderStatus(@RequestBody @Valid CancelDeliveryOrderRequest request){
        deliveryOrderService.handleCancelDeliveryOrderStatusFromInternal(request);
    }
    @PostMapping("/internal/deliveries")
    public void createDeliveryOrder(@RequestBody @Valid DeliveryOrderRequest request){
        deliveryOrderService.createDeliveryOrder(request);
    }
    @DeleteMapping("/internal/deliveries/{id}")
    public void deleteDeliveryOrder(@PathVariable Long id){
        deliveryOrderService.deleteDeliveryOrder(id);
    }


}
