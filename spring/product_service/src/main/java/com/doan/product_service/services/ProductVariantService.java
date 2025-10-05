package com.doan.product_service.services;

import com.doan.product_service.dtos.product_variant.VariantRequest;
import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@AllArgsConstructor
public class ProductVariantService {
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    public void createProductVariant(VariantRequest request){
        Product product=productRepository.findById(request.getProductId())
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm với id: "+request.getProductId()));

        Optional<ProductVariant> exist=productVariantRepository.findBySku(request.getSku());
        if(exist.isPresent()){
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"SKU đã tồn tại: "+request.getSku());
        }
        ProductVariant productVariant=new ProductVariant(
                product,
                request.getName(),
                request.getSku(),
                request.getAttributes(),
                request.getImageUrls()
        );
        productVariantRepository.save(productVariant);
    }
    public List<ProductVariant> getAllProductsIncludingInactive(){
        return productVariantRepository.findAll();
    }
    public List<ProductVariant> getAllProductsWithoutInactive(){
        return productVariantRepository.findByIsActiveIsTrue();
    }
    public void updateProductVariant(Long id, VariantRequest request){
        ProductVariant variant=productVariantRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy biến thể với id: "+id));

        if(!Objects.equals(variant.getSku(), request.getSku()) &&
                productVariantRepository.existsBySkuAndIdNot(request.getSku(),id)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"SKU biến thể đã tồn tại!");
        }
        variant.setName(request.getName());
        variant.setSku(request.getSku());
        variant.setAttributes(request.getAttributes());
        variant.setImageUrls(request.getImageUrls());

        if (request.getSellingPrice() != null && request.getSellingPrice().compareTo(BigDecimal.ZERO) != 0) {
            variant.setSellingPrice(request.getSellingPrice());
        }
        if (request.getDiscountPercent() != null &&
                request.getDiscountPercent()!= 0 &&
                variant.getSellingPrice() != null &&
                variant.getSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
            variant.setDiscountPercent(request.getDiscountPercent());
        }

        productVariantRepository.save(variant);
    }
    @Transactional
    public void changeProductVariantActive(Long id){
        ProductVariant variant=productVariantRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy biến thể với id: "+id));
        if(variant.getIsActive()==false &&
                variant.getProduct().getIsActive()==false){
             throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Sản phẩm đang bị khóa!");
        }
        variant.setIsActive(!variant.getIsActive());
    }

    public void deleteProductVariant(Long id){
        ProductVariant productVariant = productVariantRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy biến thể với id: "+id));
        productVariantRepository.delete(productVariant);
    }
}
