package com.datn.promotion_service.dto.request;

import com.datn.promotion_service.enums.PromotionType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePromotionRequest {

    @NotBlank(message = "Mã khuyến mãi là bắt buộc")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Mã chỉ được chứa chữ in hoa, số, dấu gạch dưới và dấu gạch ngang")
    private String code;

    @NotBlank(message = "Tên khuyến mãi là bắt buộc")
    private String name;

    private String description;

    @NotNull(message = "Loại khuyến mãi là bắt buộc")
    private PromotionType promotionType;

    @DecimalMin(value = "0.0", message = "Giá trị giảm giá phải lớn hơn hoặc bằng 0")
    private BigDecimal discountValue;

    @DecimalMin(value = "0.0", message = "Giá trị đơn hàng tối thiểu phải lớn hơn hoặc bằng 0")
    private BigDecimal minOrderAmount;

    private BigDecimal maxDiscountAmount;

    @Min(value = 1, message = "Giới hạn sử dụng phải ít nhất là 1")
    private Integer usageLimit;

    @Min(value = 1, message = "Giới hạn sử dụng cho mỗi khách hàng phải ít nhất là 1")
    private Integer usageLimitPerCustomer;

    @NotNull(message = "Ngày bắt đầu là bắt buộc")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime startDate;

    @NotNull(message = "Ngày kết thúc là bắt buộc")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private ZonedDateTime endDate;

    private List<Long> applicableProducts;
    private List<Long> applicableCategories;
    private List<Long> applicableBrands;

    private Long createdByStaffId;
}
