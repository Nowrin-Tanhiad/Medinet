<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $doctorName = trim($_GET['doctor_name'] ?? '');
        if (!empty($doctorName)) {
            $stmt = $pdo->prepare("SELECT * FROM appointments WHERE doctor_name LIKE :doc ORDER BY id DESC LIMIT 50");
            $stmt->execute([':doc' => '%' . $doctorName . '%']);
        } else {
            $stmt = $pdo->query("SELECT * FROM appointments ORDER BY id DESC LIMIT 50");
        }
        $appointments = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "appointments" => $appointments
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

    if ($action === 'update_status') {
        $id = intval($data['id'] ?? 0);
        $status = trim($data['status'] ?? 'Completed');
        if ($id > 0) {
            try {
                $upd = $pdo->prepare("UPDATE appointments SET status = :status WHERE id = :id");
                $upd->execute([':status' => $status, ':id' => $id]);
                echo json_encode(["success" => true, "message" => "Appointment status updated to {$status}!"]);
            } catch (PDOException $e) {
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Invalid appointment ID."]);
        }
        exit();
    }

    $doctorName = trim($data['doctor_name'] ?? '');
    $specialty = trim($data['specialty'] ?? 'General Physician');
    $hospital = trim($data['hospital'] ?? 'City Hospital, Dhaka');
    $appointmentDate = trim($data['appointment_date'] ?? date('M d, Y'));
    $appointmentTime = trim($data['appointment_time'] ?? '10:00 AM');
    $patientName = trim($data['patient_name'] ?? ($_SESSION['user']['name'] ?? 'Patient User'));
    $userId = $_SESSION['user']['id'] ?? NULL;

    $randSerial = "SL-" . str_pad(rand(1, 45), 2, '0', STR_PAD_LEFT);
    $serialNumber = trim($data['serial_number'] ?? $randSerial);
    $defaultChamber = "Building A, Floor " . rand(2, 5) . ", Room " . rand(201, 508) . " (Chamber " . rand(1, 15) . ")";
    $doctorChamber = trim($data['doctor_chamber'] ?? $defaultChamber);

    if (empty($doctorName) || empty($hospital)) {
        echo json_encode([
            "success" => false,
            "message" => "Doctor name and hospital are required to book an appointment."
        ]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO appointments (user_id, doctor_name, specialty, hospital, appointment_date, appointment_time, patient_name, serial_number, doctor_chamber, status) VALUES (:user_id, :doctor_name, :specialty, :hospital, :appointment_date, :appointment_time, :patient_name, :serial_number, :doctor_chamber, 'Confirmed')");
        $stmt->execute([
            ':user_id' => $userId,
            ':doctor_name' => $doctorName,
            ':specialty' => $specialty,
            ':hospital' => $hospital,
            ':appointment_date' => $appointmentDate,
            ':appointment_time' => $appointmentTime,
            ':patient_name' => $patientName,
            ':serial_number' => $serialNumber,
            ':doctor_chamber' => $doctorChamber
        ]);

        $appId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Appointment booked with {$doctorName}! Serial Number: {$serialNumber}",
            "appointment" => [
                "id" => $appId,
                "doctor_name" => $doctorName,
                "specialty" => $specialty,
                "hospital" => $hospital,
                "appointment_date" => $appointmentDate,
                "appointment_time" => $appointmentTime,
                "patient_name" => $patientName,
                "serial_number" => $serialNumber,
                "doctor_chamber" => $doctorChamber,
                "status" => "Confirmed"
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
