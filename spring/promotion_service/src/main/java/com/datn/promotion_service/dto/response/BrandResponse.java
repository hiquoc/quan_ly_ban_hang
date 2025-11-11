package com.datn.promotion_service.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BrandResponse {
    private Long id;
    private String name;
    private Boolean isActive ;
}