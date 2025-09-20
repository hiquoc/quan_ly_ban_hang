package com.quanlybanhang.banhang_system.mappers;

import com.quanlybanhang.banhang_system.dtos.Product.ProductRequest;
import com.quanlybanhang.banhang_system.dtos.Product.ProductResponse;
import com.quanlybanhang.banhang_system.models.Product;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProductMapper {
    ProductResponse toResponse(Product product);
    List<ProductResponse> toResponseList(List<Product> products);

    Product toEntity(ProductRequest request);
}

