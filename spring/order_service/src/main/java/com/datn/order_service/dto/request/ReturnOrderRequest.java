package com.datn.order_service.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class  ReturnOrderRequest {
    @NotNull(message = "orderId không được để trống")
    private Long orderId;
    private Long customerId;

    @NotEmpty(message = "Lý do trả hàng không được để trống")
    private String reason;

    @NotEmpty(message = "Vui lòng chọn sản phẩm cần trả")
    private List<ReturnOrderItemRequest> items;

    @NotEmpty(message = "Tên ngân hàng không được để trống")
    private String bankName;

    @NotEmpty(message = "Số tài khoản không được để trống")
    private String accountNumber;

    @NotEmpty(message = "Tên chủ tài khoản không được để trống")
    private String accountHolder;

}

