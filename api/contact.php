<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM contact_inquiries ORDER BY id DESC LIMIT 10");
        $inquiries = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "inquiries" => $inquiries
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) $data = $_POST;

    $name = trim($data['name'] ?? ($_SESSION['user']['name'] ?? 'Guest Visitor'));
    $phone = trim($data['phone'] ?? '');
    $category = trim($data['category'] ?? 'Emergency Hotline');
    $message = trim($data['message'] ?? '');

    if (empty($phone) && empty($message)) {
        echo json_encode([
            "success" => false,
            "message" => "Please provide a valid phone number or message."
        ]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO contact_inquiries (name, phone, category, message) VALUES (:name, :phone, :category, :message)");
        $stmt->execute([
            ':name' => $name,
            ':phone' => $phone,
            ':category' => $category,
            ':message' => $message
        ]);

        $inquiryId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Your inquiry has been submitted! Our emergency hub will reach out shortly.",
            "inquiry_id" => $inquiryId
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit();
}
