package com.doan.gateway_service.configs;

import com.doan.gateway_service.utils.JwtAuthFilter;
import lombok.AllArgsConstructor;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.GatewayFilterSpec;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@AllArgsConstructor
public class GatewayConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public RouteLocator customRoutes(RouteLocatorBuilder builder){
        return builder.routes()

                // AUTH SERVICE
                .route("auth-public", r -> r.path("/auth/public/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://AUTH-SERVICE"))

                .route("auth-service-login", r -> r.path("/oauth2/authorization/**")
                        .filters(GatewayFilterSpec::preserveHostHeader)
                        .uri("lb://AUTH-SERVICE"))

                .route("auth-service-callback", r -> r.path("/login/oauth2/code/**")
                        .filters(GatewayFilterSpec::preserveHostHeader)
                        .uri("lb://AUTH-SERVICE"))

                .route("auth-secure", r -> r.path("/auth/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://AUTH-SERVICE"))

                // STAFF SERVICE
                .route("staff-secure", r -> r.path("/staff/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://STAFF-SERVICE"))

                // CUSTOMER SERVICE
                .route("customer-public", r -> r.path("/customer/public/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://CUSTOMER-SERVICE"))

                .route("customer-secure", r -> r.path("/customer/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://CUSTOMER-SERVICE"))

                // PRODUCT SERVICE
                .route("product-public", r -> r.path("/product/public/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("lb://PRODUCT-SERVICE"))

                .route("product-secure", r -> r.path("/product/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://PRODUCT-SERVICE"))

                // INVENTORY SERVICE
                .route("inventory-secure", r -> r.path("/inventory/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://INVENTORY-SERVICE"))

                // CART SERVICE
                .route("cart", r -> r.path("/cart/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://CART-SERVICE"))

                // ORDER SERVICE
                .route("order", r -> r.path("/orders/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://ORDER-SERVICE"))

                .route("order-vnpay", r -> r.path("/payments/vnpay-callback")
                        .uri("lb://ORDER-SERVICE"))

                .route("order-payments", r -> r.path("/payments/**")
                        .filters(f -> f.filter(jwtAuthFilter))
                        .uri("lb://ORDER-SERVICE"))

                // PROMOTION SERVICE
                .route("promotion", r -> r.path("/promotions/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("lb://PROMOTION-SERVICE"))

                // DASHBOARD SERVICE
                .route("dashboard", r -> r.path("/dashboard/**")
                        .filters(f -> f.filter(jwtAuthFilter))
                        .uri("lb://DASHBOARD-SERVICE"))

                .build();
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http.csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges.anyExchange().permitAll())
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable);
        return http.build();
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsWebFilter(source);
    }
}
