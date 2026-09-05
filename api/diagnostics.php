<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM diagnostic_bookings ORDER BY id DESC LIMIT 10");
        $bookings = $stmt->fetchAll();

        $servicesStmt = $pdo->query("SELECT * FROM diagnostic_services ORDER BY id ASC");
        $services = $servicesStmt->fetchAll();

        echo json_encode([
            "success" => true,
            "services" => $services,
            "recentBookings" => $bookings
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit();
}

if ($method === 'DELETE' || ($method === 'POST' && (($_POST['action'] ?? '') === 'delete' || (json_decode(file_get_contents('php://input'), true)['action'] ?? '') === 'delete'))) {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) $data = $_POST;

    $id = intval($data['id'] ?? ($_GET['id'] ?? 0));
    if ($id > 0) {
        try {
            $delStmt = $pdo->prepare("DELETE FROM diagnostic_bookings WHERE id = :id");
            $delStmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Diagnostic booking deleted successfully!"]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Invalid diagnostic booking ID."]);
    }
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) $data = $_POST;

    $action = $data['action'] ?? '';
    if ($action === 'update_status') {
        $id = intval($data['id'] ?? 0);
        $status = trim($data['status'] ?? 'Completed');
        if ($id > 0) {
            try {
                $upd = $pdo->prepare("UPDATE diagnostic_bookings SET status = :status WHERE id = :id");
                $upd->execute([':status' => $status, ':id' => $id]);
                echo json_encode(["success" => true, "message" => "Diagnostic test status updated to {$status}!"]);
            } catch (PDOException $e) {
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Invalid diagnostic booking ID."]);
        }
        exit();
    }

    $serviceName = trim($data['service_name'] ?? '');
    $price = intval($data['price'] ?? 0);
    $userName = trim($data['user_name'] ?? ($_SESSION['user']['name'] ?? 'Patient User'));
    $userPhone = trim($data['user_phone'] ?? '+880 1711-000000');

    $bookingDate = trim($data['booking_date'] ?? date('M d, Y', strtotime('+1 day')));
    $randSerial = "DS-SL-" . str_pad(rand(10, 99), 2, '0', STR_PAD_LEFT);
    $serialNumber = trim($data['serial_number'] ?? $randSerial);
    $defaultLoc = "Diagnostic Wing, Floor " . rand(2, 4) . ", Room " . rand(201, 405);
    $testLocation = trim($data['test_location'] ?? $defaultLoc);

    if (empty($serviceName)) {
        echo json_encode([
            "success" => false,
            "message" => "Diagnostic service name is required."
        ]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO diagnostic_bookings (service_name, price, user_name, user_phone, booking_date, serial_number, test_location, status) VALUES (:service_name, :price, :user_name, :user_phone, :booking_date, :serial_number, :test_location, 'Confirmed')");
        $stmt->execute([
            ':service_name' => $serviceName,
            ':price' => $price,
            ':user_name' => $userName,
            ':user_phone' => $userPhone,
            ':booking_date' => $bookingDate,
            ':serial_number' => $serialNumber,
            ':test_location' => $testLocation
        ]);

        $bookingId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Successfully booked {$serviceName}! Serial Number: {$serialNumber}",
            "booking" => [
                "id" => $bookingId,
                "service_name" => $serviceName,
                "price" => $price,
                "user_name" => $userName,
                "booking_date" => $bookingDate,
                "serial_number" => $serialNumber,
                "test_location" => $testLocation,
                "status" => "Confirmed",
                "created_at" => date('Y-m-d H:i:s')
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit();
}
