package com.doan.product_service.services;

import com.doan.product_service.dtos.brand.BrandRequest;
import com.doan.product_service.dtos.other.PageCacheWrapper;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Product;
import com.doan.product_service.repositories.BrandRepository;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.services.cloud.CloudinaryService;
import jakarta.persistence.criteria.Predicate;
import lombok.AllArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class BrandService {
    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;
    private final CloudinaryService cloudinaryService;

    public void createBrand(BrandRequest brandRequest, MultipartFile image) {
        if (brandRepository.existsByName(brandRequest.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên thương hiệu đã tồn tại!");
        }
        if (brandRepository.existsBySlug(brandRequest.getSlug())) {
            throw new RuntimeException("Slug của thương hiệu đã tồn tại!");
        }
        String imgUrl = null;
        try {
            if (image != null && !image.isEmpty())
                imgUrl = cloudinaryService.uploadFile(image);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Upload image thất bại", ex);
        }
        Brand brand = new Brand(
                brandRequest.getName(),
                brandRequest.getSlug(),
                brandRequest.getDescription(),
                imgUrl
        );
        brandRepository.save(brand);
    }

    @CacheEvict(
            value = "featuredBrands",
            allEntries = true
    )
    @Transactional
    public void updateBrand(Long id, BrandRequest brandRequest, MultipartFile image) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found with id: " + id));
        if (brandRepository.existsByNameAndIdNot(brandRequest.getName(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên thương hiệu đã tồn tại!");
        }
        if (brandRepository.existsBySlugAndIdNot(brandRequest.getSlug(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug của thương hiệu đã tồn tại!");
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
        if (brandRequest.getDescription() != null
                && !brandRequest.getDescription().isEmpty()) {
            brand.setDescription(brandRequest.getDescription());
        }
        try {
            if (image != null && !image.isEmpty()) {
                if (brand.getImageUrl() != null)
                    cloudinaryService.deleteFile(brand.getImageUrl());
                String imgUrl = cloudinaryService.uploadFile(image);
                brand.setImageUrl(imgUrl);
            }

        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Có lỗi khi cập nhật hình ảnh", ex);
        }
    }
    @Cacheable(
            value = "featuredBrands",
            key = "(#p1 != null ? #p1 : 'null') + ':' + (#p4 != null ? #p4 : 'null')",
            condition = "(#p2 == null || #p2.isBlank()) && #p3 == true && (#p0==null||#p0 == 0)"
    )
    public PageCacheWrapper<Brand> getAllBrands(Integer page, Integer size, String keyword, Boolean active, Boolean featured) {
        Pageable pageable = PageRequest.of(
                page != null && page >= 0 ? page : 0,
                size != null && size > 0 ? size : 50,
                Sort.by("updatedAt").descending()
        );

        Specification<Brand> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String likeKeyword = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(
                        cb.like(
                                cb.function("unaccent", String.class, cb.lower(root.get("name"))),
                                cb.function("unaccent", String.class, cb.literal(likeKeyword))
                        )
                );
            }

            if (active != null) {
                predicates.add(cb.equal(root.get("isActive"), active));
            }
            if (featured != null) {
                predicates.add(cb.equal(root.get("isFeatured"), featured));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Brand> pageResult = brandRepository.findAll(spec, pageable);

        return new PageCacheWrapper<>(
                pageResult.getContent(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages(),
                pageResult.getNumber(),
                pageResult.getSize()
        );
    }

    @CacheEvict(
            value = "featuredBrands",
            allEntries = true
    )
    public void changeBrandActive(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found with id: " + id));
        if (brand.getIsActive() && productRepository.existsByBrandIdAndIsActiveIsTrue(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Có sản phẩm đang hoạt động thuộc thương hiệu này!");
        }
        brand.setIsActive(!brand.getIsActive());
        brandRepository.save(brand);
    }
    @CacheEvict(
            value = "featuredBrands",
            allEntries = true
    )
    public void changeBrandFeatured(Long id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found with id: " + id));

        brand.setIsFeatured(!brand.getIsFeatured());
        brandRepository.save(brand);
    }
    @CacheEvict(
            value = "featuredBrands",
            allEntries = true
    )
    public void deleteBrand(Long id) {
        if (productRepository.existsByBrandIdAndIsActiveIsTrue(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Đang có sản phẩm thuộc thương hiệu này!");
        }
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found with id: " + id));
        brandRepository.delete(brand);
    }

    public List<Brand> getBrandsByIds(List<Long> ids) {
        return brandRepository.findAllById(ids);
    }
}
