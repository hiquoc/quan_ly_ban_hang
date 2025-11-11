package com.doan.product_service.services;

import com.doan.product_service.dtos.product.ProductDetailsResponse;
import com.doan.product_service.dtos.product.ProductRequest;
import com.doan.product_service.dtos.product.ProductResponse;
import com.doan.product_service.dtos.product_variant.VariantDetailsResponse;
import com.doan.product_service.dtos.product_variant.VariantResponse;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Category;
import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.repositories.BrandRepository;
import com.doan.product_service.repositories.CategoryRepository;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import com.doan.product_service.services.cloud.CloudinaryService;
import com.doan.product_service.utils.WebhookUtils;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.*;
import org.springframework.transaction.annotation.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;


import java.io.IOException;
import java.util.*;

@Service
@AllArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final CloudinaryService cloudinaryService;


    public ProductResponse createProduct(ProductRequest productRequest, MultipartFile image) {
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
        String imageUrl = null;

        if (image != null && !image.isEmpty()) {
            try {
                imageUrl = cloudinaryService.uploadFile(image);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Upload image thất bại", e);
            }
        }
        Product product=new Product(
                productRequest.getName(),
                productRequest.getProductCode(),
                productRequest.getSlug(),
                productRequest.getShortDescription(),
                productRequest.getDescription(),
                category,
                brand,
                productRequest.getTechnicalSpecs(),
                imageUrl
                );
        productRepository.save(product);
        WebhookUtils.postToWebhook(product.getId(),"insert");
        return fromEntity(product);
    }
    public Page<ProductResponse> getAllProducts(
            Integer page,
            Integer size,
            String keyword,
            List<String> categoryName,
            List<String> brandName,
            Boolean active,
            Boolean featured,
            Boolean desc,
            String sortBy,
            Boolean discount,
            Long startPrice,
            Long endPrice,
            Boolean excludeOutOfStockProducts
    ) {
        Pageable pageable;
        if (page == null || size == null) {
            pageable = Pageable.unpaged();
        } else {
            Sort sort = "sold".equalsIgnoreCase(sortBy)
                    ? Sort.by("totalSold")
                    : "rating".equalsIgnoreCase(sortBy)
                    ? Sort.by("ratingAvg")
                    : Sort.by("updatedAt");
            sort = (desc != null && !desc) ? sort.ascending() : sort.descending();
            pageable = PageRequest.of(page, size, sort);
        }

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Keyword
            if (keyword != null && !keyword.isBlank()) {
                String likeKeyword = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.function("unaccent", String.class, cb.lower(root.get("name"))),
                                cb.function("unaccent", String.class, cb.literal(likeKeyword))),
                        cb.like(cb.function("unaccent", String.class, cb.lower(root.get("productCode"))),
                                cb.function("unaccent", String.class, cb.literal(likeKeyword)))
                ));
            }

            // Category
            if (categoryName != null && !categoryName.isEmpty()) {
                Join<Product, Category> categoryJoin = root.join("category", JoinType.INNER);
                List<Predicate> catPreds = categoryName.stream()
                        .filter(c -> c != null && !c.isBlank())
                        .map(c -> cb.like(cb.lower(categoryJoin.get("name")), "%" + c.trim().toLowerCase() + "%"))
                        .toList();
                if (!catPreds.isEmpty()) predicates.add(cb.or(catPreds.toArray(new Predicate[0])));
            }

            // Brand
            if (brandName != null && !brandName.isEmpty()) {
                Join<Product, Brand> brandJoin = root.join("brand", JoinType.INNER);
                List<Predicate> brandPreds = brandName.stream()
                        .filter(b -> b != null && !b.isBlank())
                        .map(b -> cb.like(cb.lower(brandJoin.get("name")), "%" + b.trim().toLowerCase() + "%"))
                        .toList();
                if (!brandPreds.isEmpty()) predicates.add(cb.or(brandPreds.toArray(new Predicate[0])));
            }

            // Active & Featured
            if (active != null) predicates.add(cb.equal(root.get("isActive"), active));
            if (featured != null) predicates.add(cb.equal(root.get("isFeatured"), featured));

            // Variant-based filters: discount, price range, out-of-stock
            if (Boolean.TRUE.equals(discount) || startPrice != null || endPrice != null || Boolean.TRUE.equals(excludeOutOfStockProducts)) {
                Subquery<Long> variantSub = query.subquery(Long.class);
                Root<ProductVariant> vRoot = variantSub.from(ProductVariant.class);
                variantSub.select(vRoot.get("product").get("id"));

                List<Predicate> subPreds = new ArrayList<>();
                subPreds.add(cb.equal(vRoot.get("product").get("id"), root.get("id")));

                if (Boolean.TRUE.equals(discount)) subPreds.add(cb.greaterThan(vRoot.get("discountPercent"), 0));
                if (Boolean.TRUE.equals(excludeOutOfStockProducts)) subPreds.add(cb.notEqual(cb.upper(vRoot.get("status")), "OUT_OF_STOCK"));
                if (startPrice != null) subPreds.add(cb.greaterThanOrEqualTo(vRoot.get("sellingPrice"), startPrice));
                if (endPrice != null) subPreds.add(cb.lessThanOrEqualTo(vRoot.get("sellingPrice"), endPrice));

                variantSub.where(cb.and(subPreds.toArray(new Predicate[0])));
                predicates.add(cb.exists(variantSub));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Product> productsPage = productRepository.findAll(spec, pageable);

        return productsPage.map(product -> {
            ProductResponse pr = fromEntity(product);

            List<ProductVariant> variants = product.getVariants().stream()
                    .filter(v -> excludeOutOfStockProducts == null || !excludeOutOfStockProducts
                            || !"OUT_OF_STOCK".equalsIgnoreCase(v.getStatus()))
                    .sorted(Comparator.comparing(v -> v.getProduct().getTotalSold(), Comparator.reverseOrder()))
                    .toList();

            pr.setVariants(variants.stream().map(this::toVariantDetailsResponse).toList());
            return pr;
        });
    }


    public List<Product> getAllProductsWithoutInactive(){
        return productRepository.findByIsActiveIsTrue();
    }

    @Transactional(rollbackFor = IOException.class)
    public void updateProduct(Long id, ProductRequest productRequest,MultipartFile image){
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
        String imageUrl = null;

        if (image != null && !image.isEmpty()) {
            try{
                if(product.getImageUrl()!=null && !product.getImageUrl().isBlank())
                    cloudinaryService.deleteFile(product.getImageUrl());
                imageUrl = cloudinaryService.uploadFile(image);
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Cập nhật image thất bại", e);

            }
        }
        product.setName(productRequest.getName());
        product.setSlug(productRequest.getSlug());
        product.setShortDescription(productRequest.getShortDescription());
        product.setDescription(productRequest.getDescription());
        product.setMainVariantId(productRequest.getMainVariantId());
        product.setTechnicalSpecs(productRequest.getTechnicalSpecs());

        if(imageUrl!=null)
            product.setImageUrl(imageUrl);

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
        WebhookUtils.postToWebhook(product.getId(),"update");
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
            if(product.getVariants().isEmpty())
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Sản phẩm chưa có biến thể!");
            if(product.getVariants().stream().noneMatch(ProductVariant::getIsActive))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Sản phẩm không có biến thể đang hoạt động!");

        }else{
            if(productVariantRepository.existsByProductIdAndIsActiveIsTrue(id)){
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Có biến thể đang hoạt động với sản phẩm này!");
            }
        }

        product.setIsActive(!product.getIsActive());
        productRepository.save(product);
        WebhookUtils.postToWebhook(product.getId(),"update");
    }

    public void changeProductFeatured(Long id){
        Product product=productRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm với id: "+id));
        if(!product.getIsActive())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Sản phầm đang bị khóa!");
        product.setIsFeatured(!product.getIsFeatured());
        productRepository.save(product);
        WebhookUtils.postToWebhook(product.getId(),"update");
    }
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(()->new RuntimeException("Product not found with id: "+id));
        if(productVariantRepository.existsByProductIdAndIsDeletedNative(product.getId(),false)){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Đang tồn tại biến thể của sản phẩm này!");
        }

        try{
            if(product.getImageUrl()!=null && !product.getImageUrl().isBlank())
                cloudinaryService.deleteFile(product.getImageUrl());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Xóa image thất bại", e);

        }
        productRepository.delete(product);
        WebhookUtils.postToWebhook(product.getId(),"delete");
    }

    @Transactional
    public ProductResponse fromEntity(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getProductCode(),
                product.getSlug(),
                product.getDescription(),
                product.getShortDescription(),
                product.getCategory().getName(),
                product.getBrand().getName(),
                product.getTechnicalSpecs(),
                product.getImageUrl(),
                product.getIsActive(),
                product.getIsFeatured(),
                product.getTotalSold(),
                product.getRatingAvg(),
                product.getRatingCount(),
                product.getMainVariantId(),
                product.getVariants().stream().map(this::toVariantDetailsResponse).toList(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }

    public ProductDetailsResponse getActiveProductDetails(String slug,boolean showInActive) {
        Product product =productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với slug: " + slug));
        return new ProductDetailsResponse(product.getId(), product.getName(), product.getProductCode(), product.getSlug(), product.getDescription(), product.getShortDescription(),
                product.getCategory().getName(),product.getCategory().getSlug(),product.getBrand().getName(),product.getBrand().getSlug(),product.getTotalSold(),product.getTechnicalSpecs(),
                product.getIsFeatured(), product.getMainVariantId(),product.getVariants().stream()
                .filter(v -> showInActive || v.getIsActive())
                .map(this::toVariantDetailsResponse)
                .toList());
    }
    public List<ProductResponse> getRandomActiveProductByCategory(String categorySlug) {
        if(!categoryRepository.existsBySlug(categorySlug))
            throw new ResponseStatusException( HttpStatus.NOT_FOUND,"Không tìm thấy doanh mục với slug: "+categorySlug);
        List<Product> products=productRepository.getRandomActiveProductByCategorySlug(categorySlug,10);
        return products.stream().map(p->{
            ProductResponse pr=fromEntity(p);
            pr.setVariants(p.getVariants().stream().map(this::toVariantDetailsResponse).toList());
            return pr;
        }).toList();
    }

    @Transactional
    public List<VariantResponse> getProductVariantByProductId(Long id) {
        Product product =productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với id: " + id));
        return product.getVariants().stream().map(this::toVariantResponse).toList();
    }


    private VariantResponse toVariantResponse(ProductVariant productVariant) {
        return new VariantResponse(
                productVariant.getId(),
                productVariant.getProduct() != null ? productVariant.getProduct().getId() : null,
                productVariant.getProduct() != null ? productVariant.getProduct().getName() : null,
                productVariant.getProduct() != null ? productVariant.getProduct().getProductCode() : null,
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
    private VariantDetailsResponse toVariantDetailsResponse(ProductVariant productVariant) {
        return new VariantDetailsResponse(
                productVariant.getId(),
                productVariant.getProduct() != null ? productVariant.getProduct().getId() : null,
                productVariant.getName(),
                productVariant.getSku(),
                productVariant.getBasePrice(),
                productVariant.getSellingPrice(),
                productVariant.getDiscountPercent(),
                productVariant.getAttributes(),
                productVariant.getImageUrls(),
                productVariant.getSoldCount(),
                productVariant.getStatus()
        );
    }

    public List<ProductResponse> getProductsByIds(List<Long> ids) {
        return productRepository.findAllById(ids).stream().map(this::fromEntity).toList();
    }

}
