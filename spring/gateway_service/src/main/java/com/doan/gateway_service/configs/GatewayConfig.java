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
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Objects;

@Configuration
@AllArgsConstructor
public class GatewayConfig {
    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public RouteLocator customRoutes(RouteLocatorBuilder builder){
        return builder.routes()
                // Public endpoints (no auth)
                .route("auth-public", r -> r.path("/auth/public/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://localhost:8081"))
                //social login
                .route("auth-service-login", r -> r.path("/oauth2/authorization/**", "/login/oauth2/**")
                        .filters(f -> f.preserveHostHeader()
                                .addRequestHeader("Cookie", "#{request.headers.Cookie}")
                                .addResponseHeader("Set-Cookie", "#{response.headers.Set-Cookie}"))
                        .uri("http://localhost:8081"))


                // Secured endpoints (any authenticated customer)
                .route("auth-secure", r -> r.path("/auth/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("http://localhost:8081"))

                //staff-service
                // Secured endpoints (any authenticated customer)
                .route("staff-secure", r -> r.path("/staff/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("http://localhost:8082"))

                //customer-service
                .route("customer-public", r -> r.path("/customer/public/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://localhost:8083"))

                // Secured endpoints (any authenticated customer)
                .route("customer-secure", r -> r.path("/customer/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("http://localhost:8083"))

                //product-service
                .route("product-public", r -> r.path("/product/public/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://localhost:8084"))

                // Secured endpoints (any authenticated customer)
                .route("product-secure", r -> r.path("/product/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("http://localhost:8084"))

                // inventory-service
                .route("inventory-secure", r -> r.path("/inventory/secure/**")
                        .filters(f -> f.filter(jwtAuthFilter).stripPrefix(1))
                        .uri("http://localhost:8085"))
                .build();

    }
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges.anyExchange().permitAll())
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable);
        return http.build();
    }
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of("*"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return new CorsWebFilter(source);
    }

}
