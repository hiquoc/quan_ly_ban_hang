package com.quanlybanhang.banhang_system.controllers;

import com.quanlybanhang.banhang_system.dtos.Product.ProductRequest;
import com.quanlybanhang.banhang_system.dtos.Product.ProductResponse;
import com.quanlybanhang.banhang_system.mappers.ProductMapper;
import com.quanlybanhang.banhang_system.models.Product;
import com.quanlybanhang.banhang_system.services.ProductService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;
    private final ProductMapper productMapper;
    public ProductController(ProductService productService,ProductMapper productMapper){
        this.productService=productService;
        this.productMapper=productMapper;
    }
    @GetMapping
    public List<ProductResponse> getAllProducts(){
        return productMapper.toResponseList(productService.getAllProducts());
    }
    @GetMapping("/{id}")
    public ProductResponse getProductById(@PathVariable Long id){
        return productMapper.toResponse(productService.getProductById(id));
    }
    @PostMapping
    public ProductResponse createProduct(@RequestBody Product product){
        return productMapper.toResponse(productService.createProduct(product));
    }
    @PutMapping("/{id}")
    public ProductResponse updateProduct(@PathVariable Long id,@RequestBody ProductRequest requestDetails){
        Product productDetails=productMapper.toEntity(requestDetails);
        return productMapper.toResponse(productService.updateProduct(id,productDetails));
    }
    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id){
        productService.deleteProduct(id);
    }
}
