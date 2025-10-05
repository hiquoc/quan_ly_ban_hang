package com.doan.product_service.services;

import com.doan.product_service.dtos.brand.BrandRequest;
import com.doan.product_service.models.Brand;
import com.doan.product_service.repositories.BrandRepository;
import com.doan.product_service.repositories.ProductRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@AllArgsConstructor
public class BrandService {
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    public void createBrand(BrandRequest brandRequest){
        if(brandRepository.existsByName(brandRequest.getName())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên thương hiệu đã tồn tại!");
        }
        if(brandRepository.existsBySlug(brandRequest.getSlug())){
            throw new RuntimeException("Slug của thương hiệu đã tồn tại!");
        }
        Brand brand=new Brand(
                brandRequest.getName(),
                brandRequest.getSlug(),
                brandRequest.getImageUrl()
        );
        brandRepository.save(brand);
    }
    public void updateBrand(Long id, BrandRequest brandRequest){
        Brand brand = brandRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found with id: "+id));
        if(brandRepository.existsByNameAndIdNot(brandRequest.getName(),id)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Tên thương hiệu đã tồn tại!");
        }
        if(brandRepository.existsBySlugAndIdNot(brandRequest.getSlug(),id)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Slug của thương hiệu đã tồn tại!");
        }
        if (brandRequest.getName() != null
                && !brandRequest.getName().isEmpty()
                && !brandRequest.getName().equals(brand.getName())) {
            brand.setName(brandRequest.getName());
        }
        if (brandRequest.getSlug() != null
                && !brandRequest.getSlug().isEmpty()
                && !brandRequest.getSlug().equals(brand.getSlug())) {
            brand.setSlug(brandRequest.getSlug());
        }
        if (brandRequest.getImageUrl() != null
                && !brandRequest.getImageUrl().isEmpty()
                && !brandRequest.getImageUrl().equals(brand.getImageUrl())) {
            brand.setImageUrl(brandRequest.getImageUrl());
        }
        brandRepository.save(brand);
    }
    public List<Brand> getAllBrands(){
        return brandRepository.findAll();
    }
    public void changeBrandActive(Long id){
        Brand brand = brandRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Brand not found with id: "+id));
        if(brand.getIsActive() && productRepository.existsByBrandIdAndIsActiveIsTrue(id)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Có sản phẩm đang hoạt động thuộc thương hiệu này!");
        }
        brand.setIsActive(!brand.getIsActive());
        brandRepository.save(brand);
    }
    public void deleteBrand(Long id){
        if(productRepository.existsByBrandIdAndIsActiveIsTrue(id)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Đang có sản phẩm thuộc thương hiệu này!");
        }
        Brand brand = brandRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Brand not found with id: "+id));
        brandRepository.delete(brand);
    }
}
