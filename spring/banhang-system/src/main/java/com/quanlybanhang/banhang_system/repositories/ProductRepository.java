package com.quanlybanhang.banhang_system.repositories;

import com.quanlybanhang.banhang_system.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product,Long> {
    List<Product> findByCategory(String category);
    List<Product> findByName(String name);
}
