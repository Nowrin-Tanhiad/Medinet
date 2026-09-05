<?php
session_start();
require_once __DIR__ . '/config.php';

if (isset($_SESSION['user'])) {
    echo json_encode([
        "success" => true,
        "user" => $_SESSION['user']
    ]);
} else {
    echo json_encode([
        "success" => false,
        "user" => null
    ]);
}
