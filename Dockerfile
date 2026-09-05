FROM php:8.2-apache

# Install MySQL PDO extension for PHP
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache rewrite module
RUN a2enmod rewrite

# Copy project files
COPY . /var/www/html/

# Set working permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
