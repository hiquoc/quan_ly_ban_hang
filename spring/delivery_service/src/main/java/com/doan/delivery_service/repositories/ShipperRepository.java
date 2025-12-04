package com.doan.delivery_service.repositories;

import com.doan.delivery_service.models.Shipper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShipperRepository extends JpaRepository<Shipper, Long> {
    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<Shipper> getShipperByFullName(String fullName);

    Optional<Shipper> getShipperByEmail(String email);

    List<Shipper> findAllByIdIn(List<Long> ids);

    Page<Shipper> findByFullNameContainingIgnoreCase(String fullName, Pageable pageable);

    Page<Shipper> findByEmailContainingIgnoreCase(String email, Pageable pageable);

    Page<Shipper> findByPhoneContaining(String phone, Pageable pageable);

    @Query(value = "SELECT * FROM shippers s WHERE s.id::text LIKE %:idPart%", nativeQuery = true)
    List<Shipper> findByIdLike(@Param("idPart") String idPart);

    @Query(value = "SELECT * FROM shippers s " +
            "WHERE (:keyword IS NULL OR s.id::text = :keyword " +
            "   OR s.full_name ILIKE CONCAT('%', :keyword, '%') " +
            "   OR s.email ILIKE CONCAT('%', :keyword, '%') " +
            "   OR s.phone ILIKE CONCAT('%', :keyword, '%')) " +
            "   AND (:status IS NULL OR s.status = CAST(:status AS varchar))" +
            "   AND (:active IS NULL OR s.is_active = :active)" +
            "   AND (:warehouseId IS NULL OR s.warehouse_id = :warehouseId)" +
            "   ORDER BY s.created_at DESC",
            nativeQuery = true)
    Page<Shipper> findAllByKeywordAndStatusAndWarehouseId(@Param("keyword") String keyword,
                                                          @Param("status") String status,
                                                          @Param("warehouseId") Long warehouseId,
                                                          @Param("active") Boolean active,
                                                          Pageable pageable);

    List<Shipper> findByStatus(String status);

    @Query("""
                select s, count(o.id)
                from Shipper s
                left join DeliveryOrder o on o.assignedShipper = s and o.status = 'ASSIGNED'
                where s.status = 'ONLINE'
                group by s
            """)
    List<Object[]> getAllActiveShippersWithOrderCounts();

}
