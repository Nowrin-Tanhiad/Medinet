<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $reqUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        $userId = ($reqUserId > 0) ? $reqUserId : ($_SESSION['user']['id'] ?? 0);
        if ($userId <= 0) {
            echo json_encode(["success" => false, "message" => "User ID required."]);
            exit();
        }

        $stmt = $pdo->prepare("SELECT * FROM prescriptions WHERE user_id = :user_id ORDER BY id DESC");
        $stmt->execute([':user_id' => $userId]);
        $prescriptions = $stmt->fetchAll() ?: [];

        echo json_encode([
            "success" => true,
            "prescriptions" => $prescriptions
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) $data = $_POST;

    $action = $data['action'] ?? 'add';
    $targetUserId = (int)($data['user_id'] ?? 0);
    $userId = ($targetUserId > 0) ? $targetUserId : ($_SESSION['user']['id'] ?? 0);

    if ($action === 'delete') {
        $prescId = (int)($data['prescription_id'] ?? 0);
        if ($prescId <= 0) {
            echo json_encode(["success" => false, "message" => "Prescription ID required."]);
            exit();
        }
        $delStmt = $pdo->prepare("DELETE FROM prescriptions WHERE id = :id AND user_id = :user_id");
        $delStmt->execute([':id' => $prescId, ':user_id' => $userId]);
        echo json_encode(["success" => true, "message" => "Prescription deleted successfully."]);
        exit();
    }

    $title = trim($data['title'] ?? 'Prescription Record');
    $doctorName = trim($data['doctor_name'] ?? 'Consultant Physician');
    $hospital = trim($data['hospital'] ?? 'MediConnect Healthcare');
    $dateStr = trim($data['date_str'] ?? date('M d, Y'));
    $fileData = trim($data['file_data'] ?? '');

    if (empty($fileData)) {
        echo json_encode(["success" => false, "message" => "Prescription document or note required."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO prescriptions (user_id, title, doctor_name, hospital, date_str, file_data) VALUES (:user_id, :title, :doctor_name, :hospital, :date_str, :file_data)");
        $stmt->execute([
            ':user_id' => $userId,
            ':title' => $title,
            ':doctor_name' => $doctorName,
            ':hospital' => $hospital,
            ':date_str' => $dateStr,
            ':file_data' => $fileData
        ]);
        $newId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Prescription uploaded successfully!",
            "prescription" => [
                "id" => $newId,
                "user_id" => $userId,
                "title" => $title,
                "doctor_name" => $doctorName,
                "hospital" => $hospital,
                "date_str" => $dateStr,
                "file_data" => $fileData
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit();
}
