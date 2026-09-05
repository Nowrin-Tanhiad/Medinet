<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $hospital = trim($_GET['hospital'] ?? 'City Hospital, Dhaka');
    $ward = trim($_GET['ward'] ?? 'General Ward');

    try {
        $stmt = $pdo->prepare("SELECT * FROM room_bookings WHERE hospital = :hospital ORDER BY id DESC");
        $stmt->execute([':hospital' => $hospital]);
        $existingBookings = $stmt->fetchAll() ?: [];

        // Default room list template
        $rooms = [
            ['id' => '1', 'roomNumber' => '101', 'status' => 'Available', 'user_name' => 'Vacant'],
            ['id' => '2', 'roomNumber' => '102', 'status' => 'Available', 'user_name' => 'Vacant'],
            ['id' => '3', 'roomNumber' => '103', 'status' => 'Available', 'user_name' => 'Vacant'],
            ['id' => '4', 'roomNumber' => '104', 'status' => 'Available', 'user_name' => 'Vacant'],
            ['id' => '5', 'roomNumber' => '105', 'status' => 'Available', 'user_name' => 'Vacant'],
        ];

        // Mark rooms status based on live database room_bookings
        foreach ($existingBookings as $b) {
            $bStatus = trim($b['status'] ?? '');
            $bRoomRaw = trim($b['room_number'] ?? '');
            $bRoomClean = preg_replace('/^(room|cabin|icu|ward)[-\s]*/i', '', $bRoomRaw);

            foreach ($rooms as &$r) {
                $rRoomClean = preg_replace('/^(room|cabin|icu|ward)[-\s]*/i', '', $r['roomNumber']);
                if ($rRoomClean === $bRoomClean || strtolower($r['roomNumber']) === strtolower($bRoomRaw)) {
                    if (strtolower($bStatus) === 'available' || $b['user_name'] === 'Vacant') {
                        $r['status'] = 'Available';
                        $r['user_name'] = 'Vacant';
                    } else if (strtolower($bStatus) === 'reserved') {
                        $r['status'] = 'Reserved';
                        $r['user_name'] = $b['user_name'] ?? 'Reserved Patient';
                        $r['user_phone'] = $b['user_phone'] ?? '';
                        $r['date_range'] = $b['date_range'] ?? '';
                        $r['booking_id'] = $b['id'];
                    } else {
                        $r['status'] = 'Occupied';
                        $r['user_name'] = $b['user_name'] ?? 'Occupied Patient';
                        $r['user_phone'] = $b['user_phone'] ?? '';
                        $r['date_range'] = $b['date_range'] ?? '';
                        $r['booking_id'] = $b['id'];
                    }
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
            $cleanNumber = preg_replace('/^(room|cabin|icu|ward)[-\s]*/i', '', $roomNumber);
            $stmt = $pdo->prepare("SELECT id FROM room_bookings WHERE hospital = :hospital AND (id = :id OR room_number = :rn1 OR room_number = :rn2 OR LOWER(room_number) LIKE LOWER(:rn3))");
            $stmt->execute([
                ':hospital' => $hospital,
                ':id' => $roomId,
                ':rn1' => $roomNumber,
                ':rn2' => 'Room ' . $cleanNumber,
                ':rn3' => '%' . $cleanNumber . '%'
            ]);
            $existing = $stmt->fetch();

            if ($existing) {
                if ($status === 'Available') {
                    $upd = $pdo->prepare("UPDATE room_bookings SET status = 'Available', user_name = 'Vacant' WHERE id = :id");
                    $upd->execute([':id' => $existing['id']]);
                } else {
                    $upd = $pdo->prepare("UPDATE room_bookings SET status = :status, user_name = IF(user_name = 'Vacant' OR user_name IS NULL OR user_name = '', 'Reserved Patient', user_name) WHERE id = :id");
                    $upd->execute([':status' => $status, ':id' => $existing['id']]);
                }
            } else if (!empty($roomNumber) && !empty($hospital)) {
                $ins = $pdo->prepare("INSERT INTO room_bookings (hospital, ward, room_number, date_range, user_name, user_phone, status) VALUES (:hospital, 'General Ward', :room_number, 'Current Stay', :user_name, '', :status)");
                $ins->execute([
                    ':hospital' => $hospital,
                    ':room_number' => $roomNumber,
                    ':user_name' => ($status === 'Available' ? 'Vacant' : 'Reserved Patient'),
                    ':status' => $status
                ]);
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
        $cleanNumber = preg_replace('/^(room|cabin|icu|ward)[-\s]*/i', '', $roomNumber);
        $checkExisting = $pdo->prepare("SELECT id FROM room_bookings WHERE hospital = :hospital AND (room_number = :rn1 OR room_number = :rn2 OR LOWER(room_number) LIKE LOWER(:rn3))");
        $checkExisting->execute([
            ':hospital' => $hospital,
            ':rn1' => $roomNumber,
            ':rn2' => 'Room ' . $cleanNumber,
            ':rn3' => '%' . $cleanNumber . '%'
        ]);
        $found = $checkExisting->fetch();

        if ($found) {
            $upd = $pdo->prepare("UPDATE room_bookings SET ward = :ward, date_range = :date_range, user_name = :user_name, user_phone = :user_phone, status = 'Booked' WHERE id = :id");
            $upd->execute([
                ':ward' => $ward,
                ':date_range' => $dateRange,
                ':user_name' => $userName,
                ':user_phone' => $userPhone,
                ':id' => $found['id']
            ]);
            $bookingId = $found['id'];
        } else {
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
        }

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
