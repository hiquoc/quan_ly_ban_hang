package com.datn.order_service.service;

import com.datn.order_service.dto.request.CreatePaymentRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Slf4j
public class VNPayService {

    @Value("${vnpay.url}")
    private String vnpUrl;

    @Value("${vnpay.tmn-code}")
    private String vnpTmnCode;

    @Value("${vnpay.hash-secret}")
    private String vnpHashSecret;

    @Value("${vnpay.return-url}")
    private String vnpReturnUrl;

    @Value("${vnpay.version:2.1.0}")
    private String vnpVersion;

    /**
     * Tạo URL thanh toán VNPay
     * User sẽ nhập thông tin thẻ/tài khoản trực tiếp trên trang VNPay
     */
    public String createPaymentUrl(CreatePaymentRequest request) {
        try {
            Map<String, String> vnpParams = new HashMap<>();

            vnpParams.put("vnp_Version", vnpVersion);
            vnpParams.put("vnp_Command", "pay");
            vnpParams.put("vnp_TmnCode", vnpTmnCode);

            BigDecimal amount = request.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.DOWN);

            vnpParams.put("vnp_Amount", amount.toPlainString());


            vnpParams.put("vnp_CurrCode", "VND");
            vnpParams.put("vnp_TxnRef", request.getOrderNumber());
            vnpParams.put("vnp_OrderInfo", "Thanh toan don hang " + request.getOrderNumber());
            vnpParams.put("vnp_OrderType", "other");
            vnpParams.put("vnp_Locale", "vn");

            // QUAN TRỌNG: Return URL có thêm platform parameter
            String platform = request.getPlatform() != null ? request.getPlatform() : "web";
            String returnUrl = vnpReturnUrl + "?platform=" + platform;
            vnpParams.put("vnp_ReturnUrl", returnUrl);

            vnpParams.put("vnp_IpAddr", request.getIpAddress());

            ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

            LocalDateTime now = LocalDateTime.now(vietnamZone);
            String vnpCreateDate = now.format(formatter);
            vnpParams.put("vnp_CreateDate", vnpCreateDate);

            String vnpExpireDate = now.plusMinutes(15).format(formatter);
            vnpParams.put("vnp_ExpireDate", vnpExpireDate);

            // Sắp xếp params và tạo query string
            List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
            Collections.sort(fieldNames);

            StringBuilder hashData = new StringBuilder();
            StringBuilder query = new StringBuilder();

            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = vnpParams.get(fieldName);

                if (fieldValue != null && !fieldValue.isEmpty()) {
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }

            String vnpSecureHash = hmacSHA512(vnpHashSecret, hashData.toString());
            query.append("&vnp_SecureHash=").append(vnpSecureHash);

            String paymentUrl = vnpUrl + "?" + query.toString();

            log.info("Created VNPay payment URL for order: {} on platform: {}",
                    request.getOrderNumber(), platform);

            return paymentUrl;

        } catch (Exception e) {
            log.error("Error creating VNPay payment URL", e);
            throw new RuntimeException("Failed to create payment URL", e);
        }
    }

    public boolean verifyCallback(Map<String, String> vnpParams) {
        try {
            String vnpSecureHash = vnpParams.get("vnp_SecureHash");

            if (vnpSecureHash == null || vnpSecureHash.isEmpty()) {
                log.error("vnp_SecureHash is missing");
                return false;
            }

            Map<String, String> fields = new HashMap<>();
            for (Map.Entry<String, String> entry : vnpParams.entrySet()) {
                String key = entry.getKey();
                String value = entry.getValue();

                if (key.startsWith("vnp_") &&
                        !key.equals("vnp_SecureHash") &&
                        !key.equals("vnp_SecureHashType") &&
                        value != null && !value.isEmpty()) {
                    fields.put(key, value);
                }
            }

            // Sắp xếp và tạo hash data
            List<String> fieldNames = new ArrayList<>(fields.keySet());
            Collections.sort(fieldNames);

            StringBuilder hashData = new StringBuilder();
            Iterator<String> itr = fieldNames.iterator();

            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = fields.get(fieldName);

                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));

                if (itr.hasNext()) {
                    hashData.append('&');
                }
            }

            String calculatedHash = hmacSHA512(vnpHashSecret, hashData.toString());
            boolean isValid = calculatedHash.equalsIgnoreCase(vnpSecureHash);

            log.info("VNPay callback verification - Valid: {}", isValid);

            if (!isValid) {
                log.error("Hash mismatch - Expected: {}, Got: {}", vnpSecureHash, calculatedHash);
            }

            return isValid;

        } catch (Exception e) {
            log.error("Error verifying VNPay callback", e);
            return false;
        }
    }

    /**
     * Tạo HMAC SHA512
     */
    private String hmacSHA512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);

            byte[] hashBytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder result = new StringBuilder();
            for (byte b : hashBytes) {
                result.append(String.format("%02x", b));
            }

            return result.toString();

        } catch (Exception e) {
            log.error("Error creating HMAC SHA512", e);
            throw new RuntimeException("Failed to create secure hash", e);
        }
    }

    /**
     * Lấy mô tả từ response code
     */
    public String getResponseMessage(String responseCode) {
        switch (responseCode) {
            case "00": return "Giao dịch thành công";
            case "07": return "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)";
            case "09": return "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng";
            case "10": return "Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần";
            case "11": return "Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch";
            case "12": return "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa";
            case "13": return "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)";
            case "24": return "Giao dịch không thành công do: Khách hàng hủy giao dịch";
            case "51": return "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch";
            case "65": return "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày";
            case "75": return "Ngân hàng thanh toán đang bảo trì";
            case "79": return "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định";
            default: return "Giao dịch thất bại";
        }
    }
}