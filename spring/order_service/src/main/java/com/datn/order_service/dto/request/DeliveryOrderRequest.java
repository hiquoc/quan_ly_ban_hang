package com.datn.order_service.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
public class DeliveryOrderRequest {
    @NotNull(message = "OrderId không được để trống.")
    private Long orderId;

    @NotBlank(message = "Mã đơn hàng không được để trống.")
    private String orderNumber;

    @NotBlank(message = "Tên người nhận không được để trống.")
    private String shippingName;

    @NotBlank(message = "Địa chỉ giao hàng không được để trống.")
    private String shippingAddress;

    @NotBlank(message = "Số điện thoại không được để trống.")
    @Pattern(regexp = "^(0[0-9]{9})$", message = "Số điện thoại không hợp lệ.")
    private String shippingPhone;

    @NotBlank(message = "Phương thức thanh toán không được để trống.")
    private String paymentMethod;

    @NotNull(message = "Kho hàng không được để trống.")
    private Long warehouseId;

    @NotNull(message = "Tiền COD không được để trống.")
    @DecimalMin(value = "0.0", inclusive = true, message = "Tiền COD không hợp lệ.")
    private BigDecimal codAmount;

    @NotEmpty(message = "Danh sách sản phẩm giao hàng không được để trống.")
    private List<DeliveryOrderItemRequest> itemList;

}
