# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve PHP Backend + Compiled React Frontend with Apache
FROM php:8.2-apache
RUN docker-php-ext-install pdo pdo_mysql
RUN a2enmod rewrite

# Copy everything including built dist and index.php
COPY --from=frontend-builder /app /var/www/html/

# Set working directory permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
