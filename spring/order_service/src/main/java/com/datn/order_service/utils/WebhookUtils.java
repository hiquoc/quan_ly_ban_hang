package com.datn.order_service.utils;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

public class WebhookUtils {

    private static final String WEBHOOK_URL = "http://3.27.223.232/webhook/sync/order";

    public static void postToWebhook(Long orderId,String action) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"order_id\":" + orderId + ", \"action\":\"" + action + "\"}";

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForObject(WEBHOOK_URL, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send webhook to " + WEBHOOK_URL + ": " + e.getMessage());
        }
    }
}
