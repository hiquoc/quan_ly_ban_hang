package com.datn.order_service.service.cloud;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
        @Value("${cloudinary.cloud_name}") String cloudName,
        @Value("${cloudinary.api_key}") String apiKey,
        @Value("${cloudinary.api_secret}") String apiSecret
    ) {
        cloudinary = new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudName,
            "api_key", apiKey,
            "api_secret", apiSecret,
            "secure", true
        ));
    }

    // Upload image
    public String uploadFile(MultipartFile file) throws IOException {
        Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
        return uploadResult.get("secure_url").toString();
    }

    public void deleteFile(String imageUrl) throws IOException {
        if (imageUrl == null || imageUrl.isBlank()) return;
        String publicId = extractPublicId(imageUrl);
        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }

    private String extractPublicId(String url) {
        // Remove the domain and version
        String[] parts = url.split("/");
        String fileName = parts[parts.length - 1]; // v123456/my-image.jpg
        return fileName.substring(fileName.indexOf("/") + 1, fileName.lastIndexOf('.'));
    }

}
