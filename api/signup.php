<?php
session_start();
require_once __DIR__ . '/config.php';

// Read JSON input
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    $data = $_POST;
}

$name = trim($data['name'] ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$role = strtolower(trim($data['role'] ?? 'patient'));
$password = $data['password'] ?? '';
$confirmPassword = $data['confirm_password'] ?? '';

if (empty($name) || empty($email) || empty($password)) {
    echo json_encode([
        "success" => false,
        "message" => "Please fill in all required fields (Name, Email, Password)."
    ]);
    exit();
}

if (!empty($confirmPassword) && $password !== $confirmPassword) {
    echo json_encode([
        "success" => false,
        "message" => "Passwords do not match. Please re-enter your password correctly."
    ]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email address format."
    ]);
    exit();
}

$allowedRoles = ['patient', 'doctor', 'admin'];
if (!in_array($role, $allowedRoles)) {
    $role = 'patient';
}

try {
    // Check if email already exists in user table
    $checkStmt = $pdo->prepare("SELECT user_id FROM `user` WHERE email = :email LIMIT 1");
    $checkStmt->execute([':email' => $email]);
    if ($checkStmt->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "This email is already registered. Please log in instead."
        ]);
        exit();
    }

    // Hash password securely
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $userStatus = strtoupper($role);

    // Insert new user into `user` table
    $insertStmt = $pdo->prepare("INSERT INTO `user` (name, email, password, user_status) VALUES (:name, :email, :password, :user_status)");
    $insertStmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password' => $hashedPassword,
        ':user_status' => $userStatus
    ]);

    $userId = (int)$pdo->lastInsertId();

    $userData = [
        "id" => $userId,
        "name" => $name,
        "email" => $email,
        "role" => $role
    ];

    // If patient, create entries in `patient` table and `patient_profiles` table
    $patientUid = "";
    if ($role === 'patient') {
        // Insert into patient table
        try {
            $pdo->prepare("INSERT IGNORE INTO `patient` (user_id) VALUES (:user_id)")->execute([':user_id' => $userId]);
        } catch (Exception $e) {}

        $year = date('Y');
        $patientUid = "MC-PAT-{$year}-" . str_pad($userId, 4, '0', STR_PAD_LEFT);
        $profStmt = $pdo->prepare("INSERT INTO patient_profiles (user_id, patient_uid, is_completed) VALUES (:user_id, :patient_uid, 0)");
        $profStmt->execute([
            ':user_id' => $userId,
            ':patient_uid' => $patientUid
        ]);
        $userData['patient_uid'] = $patientUid;
        $userData['is_profile_completed'] = false;
    }

    $_SESSION['user'] = $userData;

    echo json_encode([
        "success" => true,
        "message" => "Registration successful!",
        "user" => $userData
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
