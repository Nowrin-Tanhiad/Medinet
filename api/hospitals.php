<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $hospitalsStmt = $pdo->query("SELECT * FROM hospitals ORDER BY id ASC");
        $hospitals = $hospitalsStmt->fetchAll();

        // Also fetch from medical_point relational table to ensure full compatibility
        try {
            $mpStmt = $pdo->query("SELECT hospital_id as id, name, address as location, rating, 100 as total_reviews FROM medical_point");
            $mpHospitals = $mpStmt->fetchAll();
            foreach ($mpHospitals as $mp) {
                $exists = false;
                foreach ($hospitals as $h) {
                    if (strtolower(trim($h['name'])) === strtolower(trim($mp['name']))) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $hospitals[] = $mp;
                }
            }
        } catch (PDOException $e) {}

        // Strictly filter out any doctor names, chambers, or doctor entities
        $filteredHosps = [];
        foreach ($hospitals as $h) {
            $hName = trim($h['name'] ?? '');
            $hLower = strtolower($hName);
            if (
                !empty($hName) &&
                !preg_match('/^dr[\.\s]/i', $hName) &&
                strpos($hLower, 'doctor') === false &&
                strpos($hLower, 'chamber') === false &&
                strpos($hLower, 'consultant') === false &&
                strpos($hLower, 'physician') === false &&
                strpos($hLower, 'surgeon') === false &&
                empty($h['specialty']) &&
                empty($h['specialist']) &&
                empty($h['doctor_name'])
            ) {
                $filteredHosps[] = $h;
            }
        }

        $doctorsStmt = $pdo->query("SELECT * FROM doctors ORDER BY id ASC");
        $doctors = $doctorsStmt->fetchAll();

        $wards = ['General Ward', 'Deluxe Cabin', 'VIP Cabin', 'ICU / CCU'];

        echo json_encode([
            "success" => true,
            "hospitals" => array_values($filteredHosps),
            "doctors" => $doctors,
            "wards" => $wards
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

    $name = trim($data['name'] ?? '');
    $location = trim($data['location'] ?? 'Dhaka');
    $rating = floatval($data['rating'] ?? 4.8);

    if (empty($name)) {
        echo json_encode([
            "success" => false,
            "message" => "Hospital name is required."
        ]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO hospitals (name, location, rating, total_reviews) VALUES (:name, :location, :rating, 1) ON DUPLICATE KEY UPDATE location = :location2");
        $stmt->execute([
            ':name' => $name,
            ':location' => $location,
            ':rating' => $rating,
            ':location2' => $location
        ]);

        $newId = $pdo->lastInsertId();

        // Also insert into medical_point table for relational consistency
        try {
            $mpInsert = $pdo->prepare("INSERT INTO medical_point (registration_no, name, address, rating, type) VALUES (:reg_no, :name, :address, :rating, 'PRIVATE') ON DUPLICATE KEY UPDATE address = :address2");
            $regNo = "DGHS-NEW-" . rand(100, 999);
            $mpInsert->execute([
                ':reg_no' => $regNo,
                ':name' => $name,
                ':address' => $location,
                ':rating' => $rating,
                ':address2' => $location
            ]);
        } catch (PDOException $e) {}

        echo json_encode([
            "success" => true,
            "message" => "Hospital '{$name}' added successfully to database!",
            "hospital" => [
                "id" => $newId,
                "name" => $name,
                "location" => $location,
                "rating" => $rating,
                "total_reviews" => 1
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
