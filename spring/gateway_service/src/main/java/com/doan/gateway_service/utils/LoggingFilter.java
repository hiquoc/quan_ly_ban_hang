package com.doan.gateway_service.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;

@Slf4j
@Component
public class LoggingFilter implements GlobalFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String method = String.valueOf(exchange.getRequest().getMethod());
        String path = exchange.getRequest().getPath().toString();

        log.info("Incoming request: {} {}", method, path);

        return chain.filter(exchange);
    }
}
