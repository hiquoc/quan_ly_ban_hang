package com.doan.customer_service.dtos;

import com.doan.customer_service.models.Address;
import com.doan.customer_service.models.CustomerSegment;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class CustomerDetailsResponse {
    private Long id;
    private String fullName;
    private String email;
    private String phone;

    private LocalDate dateOfBirth;
    private String gender; // Male, Female, Other

    private String segmentName;

    private BigDecimal totalSpent;

    private Integer totalOrders = 0;
    private OffsetDateTime lastOrderDate;

    private String preferences; // {"favorite_categories": [], "preferred_brands": []}
    private String tags; // ["loyal", "price_sensitive"]

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    private List<Address> addresses;
}
