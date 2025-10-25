package com.doan.product_service.services;

import com.doan.product_service.dtos.product_variant.VariantRequest;
import com.doan.product_service.dtos.product_variant.VariantResponse;
import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import com.doan.product_service.services.client.InventoryServiceClient;
import com.doan.product_service.services.cloud.CloudinaryService;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@AllArgsConstructor
public class ProductVariantService {
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final CloudinaryService cloudinaryService;
    private final InventoryServiceClient inventoryServiceClient;

    @Transactional
    public void createProductVariant(VariantRequest request, List<MultipartFile> images) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy sản phẩm với id: " + request.getProductId()));
        if (productVariantRepository.findBySku(request.getSku()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU đã tồn tại: " + request.getSku());
        }
        if (images == null || images.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng upload ít nhất 1 hình ảnh!");
        }

        Map<String, String> imageUrls = new HashMap<>();
        try {
            for (int i = 0; i < images.size(); i++) {
                String key = (i == 0) ? "main" : "side" + i;
                imageUrls.put(key, cloudinaryService.uploadFile(images.get(i)));
            }
        } catch (Exception e) {
            if (!imageUrls.isEmpty()) {
                for (String url : imageUrls.values()) {
                    try {
                        cloudinaryService.deleteFile(url);
                    } catch (Exception cleanupEx) {
                        System.err.println("Cleanup failed: " + cleanupEx.getMessage());
                    }
                }
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể upload hình ảnh!");
        }

        ProductVariant productVariant = new ProductVariant(
                product,
                request.getName(),
                request.getSku(),
                request.getAttributes(),
                imageUrls
        );
        productVariantRepository.save(productVariant);
    }

    public Page<VariantResponse> getAllProductsIncludingInactive(
            Integer page,
            Integer size,
            String keyword,
            Boolean active,
            String status,
            Boolean discount,
            BigDecimal minPrice,
            BigDecimal maxPrice
    ) {

        Pageable pageable;
        if (page == null || size == null) {
            pageable = Pageable.unpaged();
        } else {
            if (page < 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số trang phải lớn hơn 0");
            if (size <= 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số lượng dữ liệu mỗi trang phải lớn hơn 0");
            pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        }

        Specification<ProductVariant> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (keyword != null && !keyword.isBlank()) {
                String likeKeyword = "%" + keyword.trim().toLowerCase() + "%";

                predicates.add(cb.or(
                        cb.like(
                                cb.function("unaccent", String.class, cb.lower(root.get("name"))),
                                cb.function("unaccent", String.class, cb.literal(likeKeyword))
                        ),
                        cb.like(
                                cb.function("unaccent", String.class, cb.lower(root.get("sku"))),
                                cb.function("unaccent", String.class, cb.literal(likeKeyword))
                        )
                ));
            }


            if (active != null) {
                predicates.add(cb.equal(root.get("isActive"), active));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (discount != null && discount) {
                predicates.add(cb.greaterThan(root.get("discountPercent"), 0));
            }

            if (minPrice != null) {
                Expression<Number> discountedPriceExpr = cb.prod(
                        root.get("sellingPrice"),
                        cb.quot(
                                cb.diff(cb.literal(100), root.get("discountPercent")),
                                cb.literal(100)
                        )
                );
                predicates.add(cb.greaterThanOrEqualTo(cb.toBigDecimal(discountedPriceExpr), minPrice));
            }
            if (maxPrice != null) {
                Expression<Number> discountedPriceExpr = cb.prod(
                        root.get("sellingPrice"),
                        cb.quot(
                                cb.diff(cb.literal(100), root.get("discountPercent")),
                                cb.literal(100)
                        )
                );
                predicates.add(cb.lessThanOrEqualTo(cb.toBigDecimal(discountedPriceExpr), maxPrice));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return productVariantRepository.findAll(spec, pageable).map(this::toVariantResponse);
    }

    public VariantResponse getProductIncludingInactive(Long id) {
        return toVariantResponse(productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id)));
    }
    public VariantResponse getProductExcludingInactive(Long id) {
        return toVariantResponse(productVariantRepository.findByIdAndIsActiveIsTrue(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id)));
    }

    public List<VariantResponse> getAllActiveProducts() {
        return productVariantRepository.findByIsActiveIsTrue().stream().map(this::toVariantResponse).toList();
    }

    public VariantResponse getActiveProduct(Long id) {
        return toVariantResponse(productVariantRepository.findByIdAndIsActiveIsTrue(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id)));
    }

    @Transactional
    public void updateVariantInfo(Long id, VariantRequest request) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy biến thể với id: " + id));

        if (!Objects.equals(variant.getSku(), request.getSku()) &&
                productVariantRepository.existsBySkuAndIdNot(request.getSku(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU biến thể đã tồn tại!");
        }

        variant.setName(request.getName());
        variant.setSku(request.getSku());
        variant.setAttributes(request.getAttributes());
        variant.setBasePrice(request.getBasePrice());
        if (request.getDiscountPercent() != null && !request.getDiscountPercent().equals(variant.getDiscountPercent())) {
            BigDecimal basePrice = variant.getBasePrice();
            int newDiscount = request.getDiscountPercent() > 0 ? request.getDiscountPercent() : 0;

            variant.setDiscountPercent(newDiscount);

            BigDecimal discountMultiplier = BigDecimal.valueOf(100 - newDiscount)
                    .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            variant.setSellingPrice(basePrice.multiply(discountMultiplier).setScale(2, RoundingMode.HALF_UP));
        }

        productVariantRepository.save(variant);
    }

    @Transactional
    public void updateVariantImages(Long id, List<MultipartFile> newImages, List<String> deletedKeys, String newMainKey) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy biến thể với id: " + id));

        Map<String, String> currentImages = new HashMap<>(variant.getImageUrls());

        try {
            if (deletedKeys != null) {
                for (String key : deletedKeys) {
                    String url = currentImages.get(key);
                    if (url != null) {
                        cloudinaryService.deleteFile(url);
                        currentImages.remove(key);
                    }
                }
            }

            if (newImages != null) {
                for (int i = 0; i < newImages.size(); i++) {
                    String key = "side" + System.currentTimeMillis() + "_" + i;
                    String url = cloudinaryService.uploadFile(newImages.get(i));
                    currentImages.put(key, url);
                }
            }

            if (newMainKey != null && !newMainKey.isBlank() && currentImages.containsKey(newMainKey) &&
                    !Objects.equals(newMainKey, "main")) {
                String oldMainUrl = currentImages.get("main");
                currentImages.put("main", currentImages.get(newMainKey));
                currentImages.put(newMainKey, oldMainUrl);
            }

            if (!currentImages.containsKey("main") && !currentImages.isEmpty()) {
                String firstKey = currentImages.keySet().iterator().next();
                currentImages.put("main", currentImages.get(firstKey));
                currentImages.remove(firstKey);
            }

            variant.setImageUrls(currentImages);
            productVariantRepository.save(variant);

        } catch (IOException io) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi upload/xóa hình ảnh!");
        }
    }


    @Transactional
    public void changeProductVariantActive(Long id) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id));
        if (variant.getIsActive() == false) {
            if (variant.getProduct().getIsActive() == false)
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sản phẩm đang bị khóa!");
            if (variant.getSellingPrice() == null || variant.getSellingPrice().compareTo(BigDecimal.ZERO) == 0)
                throw new ResponseStatusException(HttpStatus.NOT_ACCEPTABLE, "Sản phẩm đang có giá bán là 0đ!");
        }
        variant.setIsActive(!variant.getIsActive());
    }

    public void changeProductVariantStatus(Long id, String status) {
        ProductVariant variant = productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id));
        variant.setStatus(status);
        productVariantRepository.save(variant);
    }

    public void deleteProductVariant(Long id) {
        ProductVariant productVariant = productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id));
        if (inventoryServiceClient.checkPurchaseOrderByVariantId(id))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không thể xóa biến thể này!");
        productVariantRepository.delete(productVariant);
    }

    public void updateVariantImportPrice(Long id, BigDecimal importPrice) {
        ProductVariant productVariant = productVariantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy biến thể với id: " + id));
        productVariant.setImportPrice(importPrice);
        productVariantRepository.save(productVariant);
    }

    public List<ProductVariant> findByCodeContainingIgnoreCase(String code) {
        return productVariantRepository.findBySkuContainingIgnoreCase(code);
    }

    private VariantResponse toVariantResponse(ProductVariant productVariant) {
        return new VariantResponse(
                productVariant.getId(),
                productVariant.getProduct() != null ? productVariant.getProduct().getId() : null,
                productVariant.getProduct() != null ? productVariant.getProduct().getName() : null,
                productVariant.getProduct() != null ? productVariant.getProduct().getSlug() : null,
                productVariant.getName(),
                productVariant.getSku(),
                productVariant.getImportPrice(),
                productVariant.getBasePrice(),
                productVariant.getSellingPrice(),
                productVariant.getDiscountPercent(),
                productVariant.getAttributes(),
                productVariant.getImageUrls(),
                productVariant.getSoldCount(),
                productVariant.getIsActive(),
                productVariant.getStatus(),
                productVariant.getCreatedAt(),
                productVariant.getUpdatedAt()
        );
    }
}
