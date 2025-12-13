package com.datn.promotion_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class CategoryBrandIdsResponse {
    private List<Long> categoryIds;
    private List<Long> brandIds;
}
