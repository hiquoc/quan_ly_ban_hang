package com.doan.product_service.services;

import com.doan.product_service.dtos.other.HomeRequest;
import com.doan.product_service.dtos.other.HomeResponse;
import com.doan.product_service.dtos.product.ProductDetailsResponse;
import com.doan.product_service.dtos.product.ProductRequest;
import com.doan.product_service.dtos.product.ProductResponse;
import com.doan.product_service.dtos.product_variant.VariantDetailsResponse;
import com.doan.product_service.dtos.product_variant.VariantResponse;
import com.doan.product_service.dtos.rec.RecResponse;
import com.doan.product_service.dtos.rec.Recommendation;
import com.doan.product_service.models.Brand;
import com.doan.product_service.models.Category;
import com.doan.product_service.models.Product;
import com.doan.product_service.models.ProductVariant;
import com.doan.product_service.repositories.BrandRepository;
import com.doan.product_service.repositories.CategoryRepository;
import com.doan.product_service.repositories.ProductRepository;
import com.doan.product_service.repositories.ProductVariantRepository;
import com.doan.product_service.services.client.RecServiceClient;
import com.doan.product_service.services.cloud.CloudinaryService;
import com.doan.product_service.utils.WebhookUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final RecServiceClient recServiceClient;
    private final CloudinaryService cloudinaryService;
    private final CacheManager cacheManager;

    @CacheEvict(value = "homeProducts", allEntries = true)
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
    @PersistenceContext
    EntityManager em;
    // Add these private methods to the class


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
        boolean isPriceSort = "price".equalsIgnoreCase(sortBy);
        Pageable pageable;
        if (page == null || size == null) {
            pageable = Pageable.unpaged();
        } else {
            Sort sort = Sort.by("updatedAt");
            if(!isPriceSort){
                if ("sold".equalsIgnoreCase(sortBy)) {
                    sort = Sort.by("totalSold");
                } else if ("rating".equalsIgnoreCase(sortBy)) {
                    sort = Sort.by("ratingAvg");
                }
            }
            sort = (desc != null && !desc) ? sort.ascending() : sort.descending();
            pageable = PageRequest.of(page, size, sort);
        }

        if (!isPriceSort) {
            Specification<Product> spec = (root, query, cb) -> {
                Predicate wherePredicate = buildWherePredicate(cb, root, query, keyword, categoryName, brandName, active, featured, discount, startPrice, endPrice, excludeOutOfStockProducts);

                // Eager fetch variants to avoid N+1 queries, but only for non-count queries
                if (query.getResultType() != Long.class) {
                    root.fetch("variants", JoinType.LEFT);
                }
                query.distinct(true);
                return wherePredicate;
            };
            Page<Product> productsPage = productRepository.findAll(spec, pageable);
            return productsPage.map(product -> {
                ProductResponse pr = fromEntity(product);

                List<ProductVariant> variants = product.getVariants().stream()
                        .filter(v -> excludeOutOfStockProducts == null || !excludeOutOfStockProducts
                                || !"OUT_OF_STOCK".equalsIgnoreCase(v.getStatus()))
                        .toList();

                pr.setVariants(variants.stream().map(this::toVariantDetailsResponse).toList());
                return pr;
            });
        } else {
            CriteriaBuilder cb = em.getCriteriaBuilder();

            // Build predicate once for reuse in count and data (but note: must be built per query due to root/query binding)
            // For count
            CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
            Root<Product> countRoot = countQuery.from(Product.class);
            Predicate countPredicate = buildWherePredicate(cb, countRoot, countQuery, keyword, categoryName, brandName, active, featured, discount, startPrice, endPrice, excludeOutOfStockProducts);
            countQuery.select(cb.countDistinct(countRoot));
            countQuery.where(countPredicate);
            long total = em.createQuery(countQuery).getSingleResult();

            // Data query
            CriteriaQuery<Tuple> dataQuery = cb.createQuery(Tuple.class);
            Root<Product> dataRoot = dataQuery.from(Product.class);
            Predicate dataPredicate = buildWherePredicate(cb, dataRoot, dataQuery, keyword, categoryName, brandName, active, featured, discount, startPrice, endPrice, excludeOutOfStockProducts);

            // Min price subquery (with variant filters for consistency)
            Subquery<Long> minPriceSub = dataQuery.subquery(Long.class);
            Root<ProductVariant> vRoot = minPriceSub.from(ProductVariant.class);
            minPriceSub.select(cb.min(vRoot.get("sellingPrice")));
            List<Predicate> minSubPreds = buildVariantSubPredicates(cb, vRoot, dataRoot, discount, startPrice, endPrice, excludeOutOfStockProducts);
            minPriceSub.where(cb.and(minSubPreds.toArray(new Predicate[0])));

            dataQuery.multiselect(dataRoot, minPriceSub);
            dataQuery.where(dataPredicate);
            dataQuery.distinct(true);

            Order order = (desc != null && !desc) ? cb.asc(minPriceSub) : cb.desc(minPriceSub);
            dataQuery.orderBy(order);

            TypedQuery<Tuple> tq = em.createQuery(dataQuery);
            if (!pageable.isUnpaged()) {
                tq.setFirstResult((int) pageable.getOffset());
                tq.setMaxResults(pageable.getPageSize());
            }
            List<Tuple> tuples = tq.getResultList();
            List<Product> content = tuples.stream()
                    .map(tuple -> tuple.get(0, Product.class))
                    .collect(Collectors.toList());
            Page<Product> productsPage = new PageImpl<>(content, pageable, total);

            return productsPage.map(product -> {
                ProductResponse pr = fromEntity(product);

                List<ProductVariant> variants = product.getVariants().stream()
                        .filter(v -> excludeOutOfStockProducts == null || !excludeOutOfStockProducts
                                || !"OUT_OF_STOCK".equalsIgnoreCase(v.getStatus()))
                        .toList();

                pr.setVariants(variants.stream().map(this::toVariantDetailsResponse).toList());
                return pr;
            });
        }
    }
    public List<Product> getAllProductsWithoutInactive(){
        return productRepository.findByIsActiveIsTrue();
    }

    @Transactional(rollbackFor = IOException.class)
    public ProductResponse updateProduct(Long id, ProductRequest productRequest,MultipartFile image){
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy sản phẩm với id: " + id));

        if (!Objects.equals(product.getName(), productRequest.getName()) &&
                productRepository.existsByNameAndIdNot(productRequest.getName(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên sản phẩm đã tồn tại!");
        }
        if (!Objects.equals(product.getProductCode(), productRequest.getProductCode()) &&
                productRepository.existsByProductCodeAndIdNot(productRequest.getProductCode(), id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug sản phẩm đã tồn tại!");
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
        product.setProductCode(productRequest.getProductCode());
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
        Cache homeCache = cacheManager.getCache("homeProducts");
        if (homeCache != null) homeCache.clear();

        Cache productDetailsCache = cacheManager.getCache("productDetails");
        if (productDetailsCache != null) {
            String slug = product.getSlug();
            productDetailsCache.evict(slug + ":true");
            productDetailsCache.evict(slug + ":false");
        }
        return fromEntity(product);
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

        Cache homeCache = cacheManager.getCache("homeProducts");
        if (homeCache != null) homeCache.clear();

        Cache productDetailsCache = cacheManager.getCache("productDetails");
        if (productDetailsCache != null) {
            String slug = product.getSlug();
            productDetailsCache.evict(slug + ":true");
            productDetailsCache.evict(slug + ":false");
        }
    }
    public void changeProductFeatured(Long id){
        Product product=productRepository.findById(id)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy sản phẩm với id: "+id));
        if(!product.getIsActive())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Sản phầm đang bị khóa!");
        product.setIsFeatured(!product.getIsFeatured());
        productRepository.save(product);
        WebhookUtils.postToWebhook(product.getId(),"update");

        Cache homeCache = cacheManager.getCache("homeProducts");
        if (homeCache != null) homeCache.clear();

        Cache productDetailsCache = cacheManager.getCache("productDetails");
        if (productDetailsCache != null) {
            String slug = product.getSlug();
            productDetailsCache.evict(slug + ":true");
            productDetailsCache.evict(slug + ":false");
        }
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

        Cache homeCache = cacheManager.getCache("homeProducts");
        if (homeCache != null) homeCache.clear();

        Cache productDetailsCache = cacheManager.getCache("productDetails");
        if (productDetailsCache != null) {
            String slug = product.getSlug();
            productDetailsCache.evict(slug + ":true");
            productDetailsCache.evict(slug + ":false");
        }
    }

    @Cacheable(value = "productDetails", key = "#slug + ':' + #showInActive")
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


    public List<ProductResponse> getProductsByIds(List<Long> ids) {
        return productRepository.findAllById(ids).stream().map(this::fromEntity).toList();
    }

    @Cacheable(
            value = "recommendedProducts",
            key = "(#customerId == null) ? 'DEFAULT' : #customerId"
    )
    public Map<String, List<ProductResponse>> getRecommendations(Long customerId) {
        RecResponse response = recServiceClient.getRecommendations(customerId, 12);
        if (response == null)
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Có lỗi xảy ra khi lấy dữ liệu recommendations");

        List<Recommendation> recs = response.getRecommendations();
        Map<Long, Double> scoreMap = recs.stream()
                .collect(Collectors.toMap(
                        r -> (long) r.getProduct_id(),
                        Recommendation::getScore
                ));

        List<Long> productIds = recs.stream()
                .map(r -> (long) r.getProduct_id())
                .toList();

        List<Product> products = productRepository.findAllById(productIds);

        List<Product> sorted = products.stream()
                .sorted((a, b) -> Double.compare(
                        scoreMap.get(b.getId()),
                        scoreMap.get(a.getId())
                ))
                .filter(product -> product.getVariants().stream().anyMatch(
                        productVariant -> !productVariant.getStatus().equals("OUT_OF_STOCK")))
                .toList();

        List<ProductResponse> list = sorted.stream()
                .map(this::fromEntity)
                .toList();
        return Collections.singletonMap("list", list);
    }

    @CacheEvict(
            value = "recommendedProducts",
            key = "(#customerId == null) ? 'DEFAULT' : #customerId"
    )
    public void rebuildRecommendations() {
        recServiceClient.rebuildRecommendations();
    }
    public void rebuildAll() {
        recServiceClient.rebuildAll();
    }

    @Cacheable(value = "homeProducts", key = "#request.newProduct + ':' + #request.discountProduct")
    public HomeResponse getHomeProduct(HomeRequest request) {
        Page<ProductResponse> newProductList = getAllProducts(
                0, request.getNewProduct(), null, null, null, true, null, null, null, null, null, null, true);

        Page<ProductResponse> discountProductList =getAllProducts(
                0, request.getDiscountProduct(), null, null, null, true, null, null, null, true, null, null, true);

        return new HomeResponse(
                newProductList.getContent(),
                discountProductList.getContent()
        );
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


    private List<Predicate> buildBasePredicates(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder cb,
            String keyword,
            List<String> categoryName,
            List<String> brandName,
            Boolean active,
            Boolean featured
    ) {
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

        return predicates;
    }

    private List<Predicate> buildVariantSubPredicates(
            CriteriaBuilder cb,
            Root<ProductVariant> vRoot,
            Root<Product> productRoot,
            Boolean discount,
            Long startPrice,
            Long endPrice,
            Boolean excludeOutOfStockProducts
    ) {
        List<Predicate> subPreds = new ArrayList<>();
        subPreds.add(cb.equal(vRoot.get("product").get("id"), productRoot.get("id")));

        if (Boolean.TRUE.equals(discount)) subPreds.add(cb.greaterThan(vRoot.get("discountPercent"), 0));
        if (Boolean.TRUE.equals(excludeOutOfStockProducts)) subPreds.add(cb.notEqual(cb.upper(vRoot.get("status")), "OUT_OF_STOCK"));
        if (startPrice != null) subPreds.add(cb.greaterThanOrEqualTo(vRoot.get("sellingPrice"), startPrice));
        if (endPrice != null) subPreds.add(cb.lessThanOrEqualTo(vRoot.get("sellingPrice"), endPrice));

        return subPreds;
    }

    private Predicate buildWherePredicate(
            CriteriaBuilder cb,
            Root<Product> root,
            CriteriaQuery<?> query,
            String keyword,
            List<String> categoryName,
            List<String> brandName,
            Boolean active,
            Boolean featured,
            Boolean discount,
            Long startPrice,
            Long endPrice,
            Boolean excludeOutOfStockProducts
    ) {
        List<Predicate> basePredicates = buildBasePredicates(root, query, cb, keyword, categoryName, brandName, active, featured);

        boolean hasVariantFilters = Boolean.TRUE.equals(discount) || startPrice != null || endPrice != null || Boolean.TRUE.equals(excludeOutOfStockProducts);
        if (hasVariantFilters) {
            Subquery<Long> variantSub = query.subquery(Long.class);
            Root<ProductVariant> vRoot = variantSub.from(ProductVariant.class);
            variantSub.select(vRoot.get("product").get("id"));

            List<Predicate> subPreds = buildVariantSubPredicates(cb, vRoot, root, discount, startPrice, endPrice, excludeOutOfStockProducts);
            variantSub.where(cb.and(subPreds.toArray(new Predicate[0])));
            basePredicates.add(cb.exists(variantSub));
        }

        return basePredicates.isEmpty() ? cb.conjunction() : cb.and(basePredicates.toArray(new Predicate[0]));
    }

}
