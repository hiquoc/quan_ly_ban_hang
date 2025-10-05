package com.doan.product_service.repositories;

import com.doan.product_service.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product,Long> {
    List<Product> findByIsActiveIsTrue();
    boolean existsByNameAndIdNot(String name, Long id);
    boolean existsBySlugAndIdNot(String slug, Long id);
    Optional<Product> findByProductCode(String productCode);
    Optional<Product> findByName(String name);
    Optional<Product> findBySlug(String slug);
    boolean existsByBrandIdAndIsActiveIsTrue(Long id);
    boolean existsByCategoryIdAndIsActiveIsTrue(Long id);
}
