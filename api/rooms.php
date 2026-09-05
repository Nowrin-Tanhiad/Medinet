<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $hospital = trim($_GET['hospital'] ?? 'City Hospital, Dhaka');
    $ward = trim($_GET['ward'] ?? 'General Ward');

    try {
        $stmt = $pdo->prepare("SELECT * FROM room_bookings WHERE hospital = :hospital AND ward = :ward");
        $stmt->execute([':hospital' => $hospital, ':ward' => $ward]);
        $existingBookings = $stmt->fetchAll();

        // Default room list template
        $rooms = [
            ['id' => '1', 'roomNumber' => '101', 'status' => 'Available'],
            ['id' => '2', 'roomNumber' => '102', 'status' => 'Available'],
            ['id' => '3', 'roomNumber' => '103', 'status' => 'Occupied'],
            ['id' => '4', 'roomNumber' => '104', 'status' => 'Available'],
            ['id' => '5', 'roomNumber' => '105', 'status' => 'Available'],
        ];

        // Mark rooms as Occupied if booked in database
        foreach ($existingBookings as $b) {
            foreach ($rooms as &$r) {
                if ($r['roomNumber'] === $b['room_number']) {
                    $r['status'] = 'Occupied';
                }
            }
        }

        echo json_encode([
            "success" => true,
            "hospital" => $hospital,
            "ward" => $ward,
            "rooms" => $rooms
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

    $action = $data['action'] ?? '';
    if ($action === 'update_room_status') {
        $roomId = (int)($data['room_id'] ?? 0);
        $roomNumber = trim($data['room_number'] ?? '');
        $hospital = trim($data['hospital'] ?? '');
        $status = trim($data['status'] ?? 'Available');

        try {
            if ($status === 'Available') {
                if ($roomId > 0) {
                    $stmt = $pdo->prepare("UPDATE room_bookings SET status = 'Available', user_name = 'Vacant' WHERE id = :id");
                    $stmt->execute([':id' => $roomId]);
                } else if (!empty($roomNumber) && !empty($hospital)) {
                    $stmt = $pdo->prepare("UPDATE room_bookings SET status = 'Available', user_name = 'Vacant' WHERE room_number = :room_number AND hospital = :hospital");
                    $stmt->execute([':room_number' => $roomNumber, ':hospital' => $hospital]);
                }
            } else {
                if ($roomId > 0) {
                    $stmt = $pdo->prepare("UPDATE room_bookings SET status = :status WHERE id = :id");
                    $stmt->execute([':status' => $status, ':id' => $roomId]);
                } else if (!empty($roomNumber) && !empty($hospital)) {
                    $stmt = $pdo->prepare("UPDATE room_bookings SET status = :status WHERE room_number = :room_number AND hospital = :hospital");
                    $stmt->execute([':status' => $status, ':room_number' => $roomNumber, ':hospital' => $hospital]);
                }
            }
            echo json_encode(["success" => true, "message" => "Room status updated successfully!"]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    $hospital = trim($data['hospital'] ?? 'City Hospital, Dhaka');
    $ward = trim($data['ward'] ?? 'General Ward');
    $roomNumber = trim($data['room_number'] ?? '101');
    $dateRange = trim($data['date_range'] ?? 'May 24 – May 25');
    $userName = trim($data['user_name'] ?? ($_SESSION['user']['name'] ?? 'Patient User'));
    $userPhone = trim($data['user_phone'] ?? '+880 1711-000000');

    if (empty($hospital) || empty($ward) || empty($roomNumber) || empty($dateRange)) {
        echo json_encode([
            "success" => false,
            "message" => "Please select hospital, ward, room, and date range."
        ]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO room_bookings (hospital, ward, room_number, date_range, user_name, user_phone, status) VALUES (:hospital, :ward, :room_number, :date_range, :user_name, :user_phone, 'Booked')");
        $stmt->execute([
            ':hospital' => $hospital,
            ':ward' => $ward,
            ':room_number' => $roomNumber,
            ':date_range' => $dateRange,
            ':user_name' => $userName,
            ':user_phone' => $userPhone
        ]);

        $bookingId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Room {$roomNumber} booked successfully at {$hospital}!",
            "booking" => [
                "id" => $bookingId,
                "hospital" => $hospital,
                "ward" => $ward,
                "room_number" => $roomNumber,
                "date_range" => $dateRange,
                "user_name" => $userName,
                "status" => "Booked"
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
