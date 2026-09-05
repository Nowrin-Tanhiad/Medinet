<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        // 1. Fetch all comments & ratings
        $reviews = $pdo->query("SELECT * FROM reviews ORDER BY id DESC")->fetchAll();

        // 2. Fetch all room bookings
        $roomBookings = $pdo->query("SELECT * FROM room_bookings ORDER BY id DESC")->fetchAll();

        // 3. Fetch doctor-to-doctor referrals
        $referrals = $pdo->query("SELECT * FROM referrals ORDER BY id DESC")->fetchAll();

        // 4. Fetch doctor appointments
        $appointments = $pdo->query("SELECT * FROM appointments ORDER BY id DESC")->fetchAll();

        // 5. Fetch diagnostic test bookings
        $diagnosticBookings = $pdo->query("SELECT * FROM diagnostic_bookings ORDER BY id DESC")->fetchAll();

        // 6. User counts
        $userStats = [
            'total_users' => $pdo->query("SELECT COUNT(*) FROM `user`")->fetchColumn(),
            'patients' => $pdo->query("SELECT COUNT(*) FROM `user` WHERE user_status = 'PATIENT'")->fetchColumn(),
            'doctors' => $pdo->query("SELECT COUNT(*) FROM `user` WHERE user_status = 'DOCTOR'")->fetchColumn(),
            'admins' => $pdo->query("SELECT COUNT(*) FROM `user` WHERE user_status = 'ADMIN'")->fetchColumn(),
        ];

        // 7. Hospitals list
        $hospitals = $pdo->query("SELECT * FROM hospitals")->fetchAll();

        echo json_encode([
            "success" => true,
            "reviews" => $reviews,
            "roomBookings" => $roomBookings,
            "referrals" => $referrals,
            "appointments" => $appointments,
            "diagnosticBookings" => $diagnosticBookings,
            "userStats" => $userStats,
            "hospitals" => $hospitals
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit();
}
