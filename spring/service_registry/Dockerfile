# ---------- Build ----------
FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
#RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

# ---------- Runtime ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy JAR
COPY --from=builder /app/target/app.jar /app/app.jar

# Verify it exists
RUN if [ ! -f /app/app.jar ]; then echo "JAR NOT FOUND!"; ls -la /app/; exit 1; fi

EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=docker

# CORRECT PATH
ENTRYPOINT ["java", "-jar", "/app/app.jar"]