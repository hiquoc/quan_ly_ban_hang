package com.doan.product_service.utils;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class WebhookUtils {

    private static final String WEBHOOK_URL = "http://3.27.223.232/webhook/sync/product";

    @Async
    public void postToWebhook(Long customerId,String action) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"product_id\":" + customerId + ", \"action\":\"" + action + "\"}";

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        try {
            Thread.sleep(2000);
            restTemplate.postForObject(WEBHOOK_URL, entity, String.class);
        } catch (Exception e) {
            System.err.println("Failed to send webhook to " + WEBHOOK_URL + ": " + e.getMessage());
        }
    }
}
