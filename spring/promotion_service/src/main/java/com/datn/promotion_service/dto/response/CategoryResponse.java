package com.datn.promotion_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CategoryResponse {
    private Long id;
    private String name;
    private String slug;
    private Boolean isActive;
}

