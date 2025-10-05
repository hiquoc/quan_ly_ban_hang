package com.doan.product_service.services;

import com.doan.product_service.dtos.product.ProductRequest;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Category;
import com.doan.product_service.models.Product;
import com.doan.product_service.repositories.BrandRepository;
import com.doan.product_service.repositories.CategoryRepository;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;


import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@AllArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;


    public void createProduct(ProductRequest productRequest){
        Category category= categoryRepository.findById(productRequest.getCategoryId())
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy doanh mục với id: "+productRequest.getCategoryId()));
        Brand brand= brandRepository.findById(productRequest.getBrandId())
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy thương hiệu với id: "+productRequest.getBrandId()));
        Optional<Product> existCode=productRepository.findByProductCode(productRequest.getProductCode());
        if(existCode.isPresent()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mã sản phẩm đã tồn tại!");
        }
        Optional<Product> existSlug=productRepository.findBySlug(productRequest.getSlug());
        if(existSlug.isPresent()){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Slug sản phẩm đã tồn tại!");
        }
        Product product=new Product(
                productRequest.getName(),
                productRequest.getProductCode(),
                productRequest.getSlug(),
                productRequest.getDescription(),
                productRequest.getShortDescription(),
                category,
                brand,
                productRequest.getTechnicalSpecs(),
                productRequest.getImageUrl()
                );
        productRepository.save(product);
    }
    public List<Product> getAllProductsIncludingInactive(){
        return productRepository.findAll();
    }
    public List<Product> getAllProductsWithoutInactive(){
        return productRepository.findByIsActiveIsTrue();
    }
    @Transactional
    public void updateProduct(Long id, ProductRequest productRequest) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với id: " + id));

        if (!Objects.equals(product.getName(), productRequest.getName()) &&
                productRepository.existsByNameAndIdNot(productRequest.getName(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên sản phẩm đã tồn tại!");
        }

        if (!Objects.equals(product.getSlug(), productRequest.getSlug()) &&
                productRepository.existsBySlugAndIdNot(productRequest.getSlug(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug sản phẩm đã tồn tại!");
        }

        product.setName(productRequest.getName());
        product.setSlug(productRequest.getSlug());
        product.setDescription(productRequest.getDescription());
        product.setShortDescription(productRequest.getShortDescription());
        product.setImageUrl(productRequest.getImageUrl());
        product.setTechnicalSpecs(productRequest.getTechnicalSpecs());

        if (!Objects.equals(product.getCategory().getId(), productRequest.getCategoryId())) {
            Category category = categoryRepository.findById(productRequest.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy doanh mục với id: " + productRequest.getCategoryId()));
            product.setCategory(category);
        }
        if (!Objects.equals(product.getBrand().getId(), productRequest.getBrandId())) {
            Brand brand = brandRepository.findById(productRequest.getBrandId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Không tìm thấy thương hiệu với id: " + productRequest.getBrandId()));
            product.setBrand(brand);
        }
    }
    @Transactional
    public void changeProductActive(Long id){
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm"));

        if(!product.getIsActive()){
            if(!product.getCategory().getIsActive())
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Doanh mục đang bị khóa!");
            if(!product.getBrand().getIsActive())
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Thương hiệu đang bị khóa!");
        }else{
            if(productVariantRepository.existsByProductIdAndIsActiveIsTrue(id)){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Có biến thể đang hoạt động với sản phẩm này!");
            }
        }

        product.setIsActive(!product.getIsActive());
        productRepository.save(product);
    }

    public void changeProductFeatured(Long id){
        Product product=productRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm với id: "+id));
        if(!product.getIsActive())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Sản phầm đang bị khóa!");
        product.setIsFeatured(!product.getIsFeatured());
        productRepository.save(product);
    }
    public void deleteProduct(Long id){
        //Kiem tra rang buoc
        Product product = productRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Product not found with id: "+id));
        if(productVariantRepository.existsByProductId(product.getId())){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Đang tồn tại biến thể của sản phẩm này!");
        }
        productRepository.delete(product);
    }

}
