package com.quanlybanhang.banhang_system.services;

import com.quanlybanhang.banhang_system.models.Product;
import com.quanlybanhang.banhang_system.repositories.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {
    private  final ProductRepository productRepository;
    public  ProductService(ProductRepository productRepository){
        this.productRepository=productRepository;
    }
    public List<Product> getAllProducts(){
        return productRepository.findAll();
    }
    public Product getProductById(Long id){
        return productRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Product not found with id: "+id));
    }
    public List<Product> getProductsByName(String name){
        return productRepository.findByName(name);
    }
    public Product createProduct(Product product){
        return productRepository.save(product);
    }
    public Product updateProduct(Long id,Product productDetails){
        return productRepository.findById(id)
                .map(product -> {
                    product.setName(productDetails.getName());
                    product.setCategory(productDetails.getCategory());
                    product.setPrice(productDetails.getPrice());
                    product.setStock(productDetails.getStock());
                    return productRepository.save(product);
                })
                .orElseThrow(()->new RuntimeException("Product not found"));
    }
    public void deleteProduct(Long id){
        productRepository.deleteById(id);
    }
}
