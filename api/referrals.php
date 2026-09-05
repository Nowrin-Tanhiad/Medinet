<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM referrals ORDER BY id DESC LIMIT 20");
        $referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Seed default referrals if table is empty
        if (empty($referrals)) {
            $defaultReferrals = [
                [
                    'from_doctor' => 'Dr. Rahman Islam',
                    'to_doctor' => 'Dr. Tanhiad',
                    'patient_name' => 'Abdullah Hossain',
                    'patient_details' => '45 Male',
                    'reason' => 'Persistent headache and dizziness. Requesting neurosurgical evaluation.',
                    'doctor_notes' => "[Sep 04, 9:30 am] Dr. Rahman: Patient requires priority specialist checkup.\n[Sep 04, 9:45 am] Dr. Tanhiad: Checked patient records. Added to priority queue.",
                    'status' => 'Priority Queue'
                ],
                [
                    'from_doctor' => 'Dr. Shakil Ahmed',
                    'to_doctor' => 'Dr. Tanhiad',
                    'patient_name' => 'Karim Chowdhury',
                    'patient_details' => '52 Male',
                    'reason' => 'Cardiac & spinal risk evaluation before surgery.',
                    'doctor_notes' => '[Sep 04, 8:15 am] Dr. Shakil: Patient reports stable vitals. Prescriptions attached.',
                    'status' => 'In Review'
                ],
                [
                    'from_doctor' => 'Dr. Tawhidul Islam',
                    'to_doctor' => 'Dr. Tanhiad',
                    'patient_name' => 'Fatema Begum',
                    'patient_details' => '38 Female',
                    'reason' => 'Post-op neurological checkup & MRI review.',
                    'doctor_notes' => '[Sep 04, 7:50 am] Dr. Tanhiad: MRI reports verified. Consultation completed.',
                    'status' => 'Completed'
                ]
            ];

            foreach ($defaultReferrals as $ref) {
                $ins = $pdo->prepare("INSERT INTO referrals (from_doctor, to_doctor, patient_name, patient_details, reason, doctor_notes, status) VALUES (:from_doctor, :to_doctor, :patient_name, :patient_details, :reason, :doctor_notes, :status)");
                $ins->execute($ref);
            }

            $stmt = $pdo->query("SELECT * FROM referrals ORDER BY id DESC LIMIT 20");
            $referrals = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode([
            "success" => true,
            "referrals" => $referrals
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

    $action = $data['action'] ?? 'create';

    if ($action === 'update_status') {
        $id = (int)($data['id'] ?? 0);
        $status = trim($data['status'] ?? 'Accepted');
        $assignedChamber = trim($data['assigned_chamber'] ?? '');
        $doctorChamber = trim($data['doctor_chamber'] ?? '');
        if ($id > 0) {
            $stmt = $pdo->prepare("UPDATE referrals SET status = :status, assigned_chamber = :assigned_chamber, doctor_chamber = :doctor_chamber WHERE id = :id");
            $stmt->execute([
                ':status' => $status,
                ':assigned_chamber' => $assignedChamber,
                ':doctor_chamber' => $doctorChamber,
                ':id' => $id
            ]);

            // Sync with appointments table if assigned_chamber is provided
            if (!empty($assignedChamber)) {
                $refStmt = $pdo->prepare("SELECT * FROM referrals WHERE id = :id");
                $refStmt->execute([':id' => $id]);
                $ref = $refStmt->fetch();
                if ($ref) {
                    $updApp = $pdo->prepare("UPDATE appointments SET hospital = :hospital, doctor_chamber = :doctor_chamber WHERE patient_name = :pname");
                    $updApp->execute([
                        ':hospital' => $assignedChamber,
                        ':doctor_chamber' => $doctorChamber,
                        ':pname' => $ref['patient_name']
                    ]);
                }
            }

            echo json_encode(["success" => true, "message" => "Referral status & chamber updated successfully!"]);
            exit();
        }
    }

    if ($action === 'add_note' || $action === 'add_message') {
        $id = (int)($data['id'] ?? 0);
        $note = trim($data['note'] ?? $data['message'] ?? '');
        $sender = trim($data['sender'] ?? 'Doctor');
        if ($id > 0 && !empty($note)) {
            $stmtFetch = $pdo->prepare("SELECT doctor_notes FROM referrals WHERE id = :id");
            $stmtFetch->execute([':id' => $id]);
            $existing = $stmtFetch->fetchColumn() ?: '';
            
            $timestamp = date('M d, g:i a');
            $newFormattedNote = ($existing ? $existing . "\n" : '') . "[{$timestamp}] {$sender}: {$note}";
            
            $stmt = $pdo->prepare("UPDATE referrals SET doctor_notes = :doctor_notes WHERE id = :id");
            $stmt->execute([':doctor_notes' => $newFormattedNote, ':id' => $id]);
            echo json_encode([
                "success" => true,
                "message" => "Message sent successfully!",
                "doctor_notes" => $newFormattedNote
            ]);
            exit();
        }
    }

    $fromDoctor = trim($data['from_doctor'] ?? 'Dr. Rahman Islam');
    $toDoctor = trim($data['to_doctor'] ?? 'Dr. Farhana Khan');
    $patientName = trim($data['patient_name'] ?? 'Abdullah Hossain');
    $patientDetails = trim($data['patient_details'] ?? '45 Male');
    $reason = trim($data['reason'] ?? 'Persistent headache and dizziness');
    $notes = trim($data['doctor_notes'] ?? '');

    if (empty($fromDoctor) || empty($toDoctor) || empty($patientName) || empty($reason)) {
        echo json_encode([
            "success" => false,
            "message" => "All required referral fields must be provided."
        ]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO referrals (from_doctor, to_doctor, patient_name, patient_details, reason, doctor_notes, status) VALUES (:from_doctor, :to_doctor, :patient_name, :patient_details, :reason, :doctor_notes, 'In Review')");
        $stmt->execute([
            ':from_doctor' => $fromDoctor,
            ':to_doctor' => $toDoctor,
            ':patient_name' => $patientName,
            ':patient_details' => $patientDetails,
            ':reason' => $reason,
            ':doctor_notes' => $notes
        ]);

        $newId = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "message" => "Referral created successfully!",
            "referral" => [
                "id" => $newId,
                "from_doctor" => $fromDoctor,
                "to_doctor" => $toDoctor,
                "patient_name" => $patientName,
                "patient_details" => $patientDetails,
                "reason" => $reason,
                "doctor_notes" => $notes,
                "status" => "In Review",
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
