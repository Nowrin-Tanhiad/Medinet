<?php
session_start();
session_unset();
session_destroy();

require_once __DIR__ . '/config.php';

echo json_encode([
    "success" => true,
    "message" => "Logged out successfully."
]);
