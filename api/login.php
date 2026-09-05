<?php
session_start();
require_once __DIR__ . '/config.php';

// Read JSON input
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    $data = $_POST;
}

$email = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Please provide both Email and Password."
    ]);
    exit();
}

try {
    // Fetch user by email from user table
    $stmt = $pdo->prepare("SELECT user_id, name, email, user_status, password, DOB, gender, address FROM `user` WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid email address or password."
        ]);
        exit();
    }

    $role = strtolower($user['user_status'] ?? 'patient');
    $prefix = ($role === 'doctor') ? 'D-' : (($role === 'admin') ? 'A-' : 'P-');
    $userUid = $prefix . '2026-' . str_pad($user['user_id'], 5, '0', STR_PAD_LEFT);

    $userData = [
        "id" => (int)$user['user_id'],
        "name" => $user['name'],
        "email" => $user['email'],
        "role" => $role,
        "user_uid" => $userUid,
        "dob" => $user['DOB'],
        "gender" => $user['gender'],
        "address" => $user['address'],
        "is_profile_completed" => true
    ];

    if ($role === 'patient') {
        $profStmt = $pdo->prepare("SELECT patient_uid, is_completed FROM patient_profiles WHERE user_id = :user_id LIMIT 1");
        $profStmt->execute([':user_id' => $user['user_id']]);
        $prof = $profStmt->fetch();

        if ($prof) {
            $userData['patient_uid'] = $userUid;
            $userData['is_profile_completed'] = ((int)($prof['is_completed'] ?? 0) === 1);
        } else {
            $userData['patient_uid'] = $userUid;
            $userData['is_profile_completed'] = false;
        }
    }

    $_SESSION['user'] = $userData;

    echo json_encode([
        "success" => true,
        "message" => "Login successful!",
        "user" => $userData
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
