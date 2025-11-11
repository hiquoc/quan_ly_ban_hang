package com.datn.promotion_service.utils;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

public class WebhookUtils {

    private static final String WEBHOOK_URL = "http://34.60.240.21:5678/webhook/sync/promotion";

    public static void postToWebhook(Long promotionId,String action) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"promotion_id\":" + promotionId + ", \"action\":\"" + action + "\"}";

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForObject(WEBHOOK_URL, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send webhook to " + WEBHOOK_URL + ": " + e.getMessage());
        }
    }
}
