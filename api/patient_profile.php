<?php
session_start();
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user'])) {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please log in first."
    ]);
    exit();
}

$user = $_SESSION['user'];
$userId = (int)$user['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        // Fetch user base details from user table
        $userStmt = $pdo->prepare("SELECT user_id, name, email, user_status, DOB, gender, address FROM `user` WHERE user_id = :user_id LIMIT 1");
        $userStmt->execute([':user_id' => $userId]);
        $userInfo = $userStmt->fetch();

        if ($userInfo) {
            $user['name'] = $userInfo['name'] ?? $user['name'];
            $user['email'] = $userInfo['email'] ?? $user['email'];
            $user['dob'] = $userInfo['DOB'] ?? '';
            $user['gender'] = $userInfo['gender'] ?? '';
            $user['address'] = $userInfo['address'] ?? '';
        }

        // Fetch patient profile
        $stmt = $pdo->prepare("SELECT * FROM patient_profiles WHERE user_id = :user_id LIMIT 1");
        $stmt->execute([':user_id' => $userId]);
        $profile = $stmt->fetch();

        // Auto-create patient profile if missing
        if (!$profile) {
            $year = date('Y');
            $patientUid = "MC-PAT-{$year}-" . str_pad($userId, 4, '0', STR_PAD_LEFT);
            $ins = $pdo->prepare("INSERT INTO patient_profiles (user_id, patient_uid, is_completed, date_of_birth, gender, address) VALUES (:user_id, :patient_uid, 0, :dob, :gender, :address)");
            $ins->execute([
                ':user_id' => $userId, 
                ':patient_uid' => $patientUid,
                ':dob' => $user['dob'] ?: null,
                ':gender' => $user['gender'] ?: 'Female',
                ':address' => $user['address'] ?: ''
            ]);

            $stmt->execute([':user_id' => $userId]);
            $profile = $stmt->fetch();
        }

        // Merge user table data into profile fallback values
        if ($profile) {
            if (empty($profile['date_of_birth']) && !empty($user['dob'])) $profile['date_of_birth'] = $user['dob'];
            if (empty($profile['gender']) && !empty($user['gender'])) $profile['gender'] = $user['gender'];
            if (empty($profile['address']) && !empty($user['address'])) $profile['address'] = $user['address'];
        }

        // Helper: Check if appointment date and time is in the future
        function isAppointmentUpcomingPHP($dateStr, $timeStr = '') {
            $dateStr = trim($dateStr ?? '');
            $timeStr = trim($timeStr ?? '');
            if (empty($dateStr)) return true;

            $combined = $dateStr;
            if (!empty($timeStr)) {
                $combined .= ' ' . $timeStr;
            }

            $appTs = strtotime($combined);
            if ($appTs === false) {
                $appTs = strtotime($dateStr);
                if ($appTs === false) return true;
                return ($appTs + 86400) >= time();
            }

            return $appTs >= time();
        }

        // Fetch appointments matching user_id or patient_name for guest bookings
        $appStmt = $pdo->prepare("SELECT * FROM appointments WHERE user_id = :user_id OR (patient_name = :pname AND patient_name != '' AND (user_id IS NULL OR user_id = 0)) ORDER BY id DESC");
        $appStmt->execute([':user_id' => $userId, ':pname' => $user['name']]);
        $rawAppointments = $appStmt->fetchAll() ?: [];

        // Categorize into upcoming (active appointments until Doctor marks Completed/Done)
        $upcomingAppointments = [];
        foreach ($rawAppointments as $ap) {
            $apStatus = strtolower(trim($ap['status'] ?? ''));
            if ($apStatus !== 'completed' && $apStatus !== 'done' && $apStatus !== 'cancelled') {
                $upcomingAppointments[] = $ap;
            }
        }

        // Fetch prescriptions
        $prescStmt = $pdo->prepare("SELECT * FROM prescriptions WHERE user_id = :user_id ORDER BY id DESC");
        $prescStmt->execute([':user_id' => $userId]);
        $prescriptions = $prescStmt->fetchAll() ?: [];

        // Fetch room bookings list & count
        $userRoomsStmt = $pdo->prepare("SELECT * FROM room_bookings WHERE user_name = :uname OR user_name = :uname2 ORDER BY id DESC");
        $userRoomsStmt->execute([':uname' => $user['name'], ':uname2' => $user['email']]);
        $userRoomBookings = $userRoomsStmt->fetchAll() ?: [];
        $roomCount = count($userRoomBookings);

        // Fetch reviews for logged-in user
        try {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN user_id INT(11) NULL AFTER id");
        } catch (Exception $e) {}

        $revStmt = $pdo->prepare("SELECT * FROM reviews WHERE user_id = :user_id OR (user_name = :uname AND user_name != '') ORDER BY id DESC");
        $revStmt->execute([':user_id' => $userId, ':uname' => $user['name']]);
        $reviews = $revStmt->fetchAll() ?: [];

        // Fetch diagnostic bookings list for logged-in user
        $diagCount = 0;
        $userDiagnostics = [];
        try {
            $diagStmt = $pdo->prepare("SELECT * FROM diagnostic_bookings WHERE user_name = :uname ORDER BY id DESC");
            $diagStmt->execute([':uname' => $user['name']]);
            $userDiagnostics = $diagStmt->fetchAll() ?: [];
            foreach ($userDiagnostics as $ud) {
                $dStatus = strtolower(trim($ud['status'] ?? ''));
                if ($dStatus !== 'completed' && $dStatus !== 'done' && $dStatus !== 'cancelled') {
                    $diagCount++;
                }
            }
        } catch (Exception $e) {}

        // Fetch available doctors cleanly deduplicated by normalized doctor name
        $doctorsMap = [];
        try {
            $docStmt2 = $pdo->query("
                SELECT 
                    d.user_id as id,
                    u.name as name,
                    u.name as doctor_name,
                    u.email as doctor_email,
                    u.gender as doctor_gender,
                    u.address as doctor_address,
                    d.specialist as specialty,
                    d.specialist,
                    d.rating,
                    d.schedule,
                    d.quality,
                    d.experience_year as experience,
                    d.experience_year,
                    d.license_no,
                    COALESCE(u.address, 'City Hospital, Dhaka') as hospital
                FROM doctor d 
                JOIN `user` u ON d.user_id = u.user_id
            ");
            $userDocs = $docStmt2->fetchAll() ?: [];
            foreach ($userDocs as $ud) {
                $rawName = $ud['doctor_name'] ?? '';
                $normKey = strtolower(trim(preg_replace('/^dr[\.\s]*/i', '', $rawName)));
                if (!empty($normKey)) {
                    $doctorsMap[$normKey] = $ud;
                }
            }
        } catch (Exception $e) {}

        try {
            $docStmt = $pdo->query("SELECT * FROM `doctors` ORDER BY rating DESC");
            $masterDocs = $docStmt->fetchAll() ?: [];
            foreach ($masterDocs as $md) {
                $rawName = $md['name'] ?? '';
                $normKey = strtolower(trim(preg_replace('/^dr[\.\s]*/i', '', $rawName)));
                if (!empty($normKey) && !isset($doctorsMap[$normKey])) {
                    $doctorsMap[$normKey] = $md;
                }
            }
        } catch (Exception $e) {}

        $doctors = array_values($doctorsMap);

        // Fetch available hospitals strictly from 'hospitals' table
        $hospitals = [];
        try {
            $hospStmt = $pdo->query("SELECT * FROM `hospitals` ORDER BY rating DESC");
            $rawHosps = $hospStmt->fetchAll() ?: [];
            foreach ($rawHosps as $rh) {
                $hName = trim($rh['name'] ?? '');
                $hLower = strtolower($hName);
                if (
                    !empty($hName) &&
                    !preg_match('/^dr[\.\s]/i', $hName) &&
                    strpos($hLower, 'doctor') === false &&
                    strpos($hLower, 'chamber') === false &&
                    strpos($hLower, 'consultant') === false &&
                    strpos($hLower, 'physician') === false &&
                    strpos($hLower, 'surgeon') === false &&
                    empty($rh['specialty']) &&
                    empty($rh['specialist']) &&
                    empty($rh['doctor_name'])
                ) {
                    $hospitals[] = $rh;
                }
            }
        } catch (Exception $e) {}

        // Collect past unreviewed services for automated rating prompts (STRICT: Only completed visits)
        $reviewedTargets = [];
        foreach ($reviews as $rev) {
            $tNorm = strtolower(trim(preg_replace('/^dr[\.\s]*/i', '', $rev['target_name'] ?? '')));
            if (!empty($tNorm)) {
                $reviewedTargets[$tNorm] = true;
            }
        }

        $pastVisitedServices = [];
        $seenServiceKeys = [];

        foreach ($rawAppointments as $ap) {
            $apStatus = strtolower(trim($ap['status'] ?? ''));
            // STRICT RULE: Only show rating prompt if Doctor marked consultation Completed or Done
            if ($apStatus !== 'completed' && $apStatus !== 'done') {
                continue;
            }

            $docName = trim($ap['doctor_name'] ?? '');
            $apId = 'app_' . $ap['id'];

            if (!empty($docName) && !isset($seenServiceKeys[$apId])) {
                $seenServiceKeys[$apId] = true;
                $pastVisitedServices[] = [
                    'id' => $apId,
                    'appointment_id' => $ap['id'],
                    'target_name' => $docName,
                    'target_type' => 'doctor',
                    'hospital' => $ap['hospital'] ?? '',
                    'service_date' => ($ap['appointment_date'] ?? '') . (!empty($ap['appointment_time']) ? ' at ' . $ap['appointment_time'] : ''),
                    'title' => 'Consultation with ' . $docName . ' (' . ($ap['specialty'] ?? 'Specialist') . ')',
                    'status' => $ap['status'] ?? 'Completed'
                ];
            }
        }

        foreach ($userDiagnostics as $ud) {
            $diagStatus = strtolower(trim($ud['status'] ?? ''));
            // STRICT RULE: Only show rating prompt if Admin marked diagnostic test Completed or Done
            if ($diagStatus !== 'completed' && $diagStatus !== 'done') {
                continue;
            }

            $diagName = trim($ud['service_name'] ?? '');
            $diagId = 'diag_' . $ud['id'];

            if (!empty($diagName) && !isset($seenServiceKeys[$diagId])) {
                $seenServiceKeys[$diagId] = true;
                $pastVisitedServices[] = [
                    'id' => $diagId,
                    'target_name' => $ud['service_name'],
                    'target_type' => 'hospital',
                    'hospital' => 'Diagnostic Center',
                    'service_date' => $ud['booking_date'] ?? date('M d, Y'),
                    'title' => 'Diagnostic Test: ' . $ud['service_name'],
                    'status' => $ud['status'] ?? 'Completed'
                ];
            }
        }

        echo json_encode([
            "success" => true,
            "user" => $user,
            "profile" => $profile,
            "appointments" => $upcomingAppointments,
            "allAppointments" => $rawAppointments,
            "prescriptions" => $prescriptions,
            "reviews" => $reviews,
            "doctors" => $doctors,
            "hospitals" => $hospitals,
            "diagnosticBookings" => $userDiagnostics,
            "roomBookings" => $userRoomBookings,
            "pastVisitedServices" => $pastVisitedServices,
            "stats" => [
                "prescriptionsCount" => count($prescriptions),
                "appointmentsCount" => count($upcomingAppointments),
                "roomsCount" => $roomCount,
                "reviewsCount" => count($reviews),
                "diagnosticCount" => $diagCount
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

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    if (!$data) $data = $_POST;

    $action = $data['action'] ?? 'update_profile';

    if ($action === 'delete_diagnostic') {
        $id = intval($data['id'] ?? 0);
        if ($id > 0) {
            $delStmt = $pdo->prepare("DELETE FROM diagnostic_bookings WHERE id = :id");
            $delStmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Diagnostic test booking removed successfully!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid ID."]);
        }
        exit();
    }

    if ($action === 'delete_appointment') {
        $id = intval($data['id'] ?? 0);
        if ($id > 0) {
            $delStmt = $pdo->prepare("DELETE FROM appointments WHERE id = :id");
            $delStmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Appointment cancelled successfully!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid ID."]);
        }
        exit();
    }

    if ($action === 'delete_prescription') {
        $id = intval($data['id'] ?? 0);
        if ($id > 0) {
            $delStmt = $pdo->prepare("DELETE FROM prescriptions WHERE id = :id");
            $delStmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Prescription deleted successfully!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid ID."]);
        }
        exit();
    }

    if ($action === 'delete_review') {
        $id = intval($data['id'] ?? 0);
        if ($id > 0) {
            $delStmt = $pdo->prepare("DELETE FROM reviews WHERE id = :id");
            $delStmt->execute([':id' => $id]);
            echo json_encode(["success" => true, "message" => "Review deleted successfully!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid ID."]);
        }
        exit();
    }

    if ($action === 'create_appointment') {
        $doctorName = trim($data['doctor_name'] ?? 'Dr. Nusrat Jahan');
        $specialty = trim($data['specialty'] ?? 'Cardiologist');
        $hospital = trim($data['hospital'] ?? 'City Hospital, Dhaka');
        $appDate = trim($data['appointment_date'] ?? date('M d, Y', strtotime('+2 days')));
        $appTime = trim($data['appointment_time'] ?? '10:30 AM');
        $patientName = trim($data['patient_name'] ?? ($user['name'] ?? 'Patient User'));
        
        // Auto-generate serial number and chamber assignment
        $randSerialNum = "SL-" . str_pad(rand(1, 45), 2, '0', STR_PAD_LEFT);
        $serialNumber = trim($data['serial_number'] ?? $randSerialNum);
        
        $defaultChamber = "Building A, Floor " . rand(2, 5) . ", Room " . rand(201, 508) . " (Chamber " . rand(1, 15) . ")";
        $doctorChamber = trim($data['doctor_chamber'] ?? $defaultChamber);

        try {
            $insApp = $pdo->prepare("INSERT INTO appointments (user_id, doctor_name, specialty, hospital, appointment_date, appointment_time, patient_name, serial_number, doctor_chamber, status) VALUES (:user_id, :doctor_name, :specialty, :hospital, :appointment_date, :appointment_time, :patient_name, :serial_number, :doctor_chamber, 'Confirmed')");
            $insApp->execute([
                ':user_id' => $userId,
                ':doctor_name' => $doctorName,
                ':specialty' => $specialty,
                ':hospital' => $hospital,
                ':appointment_date' => $appDate,
                ':appointment_time' => $appTime,
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
                    "appointment_date" => $appDate,
                    "appointment_time" => $appTime,
                    "patient_name" => $patientName,
                    "serial_number" => $serialNumber,
                    "doctor_chamber" => $doctorChamber,
                    "status" => "Confirmed"
                ]
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    if ($action === 'upload_prescription') {
        $title = trim($data['title'] ?? ('Prescription - ' . date('M d, Y')));
        $doctorName = trim($data['doctor_name'] ?? 'Self / Uploaded');
        $hospital = trim($data['hospital'] ?? 'Patient Vault');
        $dateStr = trim($data['date_str'] ?? date('M d, Y'));
        $fileData = trim($data['file_data'] ?? '');

        try {
            $insP = $pdo->prepare("INSERT INTO prescriptions (user_id, title, doctor_name, hospital, date_str, file_data) VALUES (:user_id, :title, :doctor_name, :hospital, :date_str, :file_data)");
            $insP->execute([
                ':user_id' => $userId,
                ':title' => $title,
                ':doctor_name' => $doctorName,
                ':hospital' => $hospital,
                ':date_str' => $dateStr,
                ':file_data' => $fileData
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Prescription image uploaded successfully!"
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    if ($action === 'submit_review') {

        $targetName = trim($data['target_name'] ?? 'City Hospital, Dhaka');
        $targetType = trim($data['target_type'] ?? 'hospital');
        $rating = (int)($data['rating'] ?? 5);
        $comment = trim($data['comment'] ?? 'Excellent healthcare service!');
        $userName = trim($user['name'] ?? 'Patient User');

        try {
            $insRev = $pdo->prepare("INSERT INTO reviews (user_id, user_name, target_name, target_type, rating, comment) VALUES (:user_id, :user_name, :target_name, :target_type, :rating, :comment)");
            $insRev->execute([
                ':user_id' => $userId,
                ':user_name' => $userName,
                ':target_name' => $targetName,
                ':target_type' => $targetType,
                ':rating' => $rating,
                ':comment' => $comment
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Review submitted successfully!"
            ]);
        } catch (PDOException $e) {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
        exit();
    }

    $dob = trim($data['date_of_birth'] ?? '');
    $gender = trim($data['gender'] ?? 'Female');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? '');
    $bloodGroup = trim($data['blood_group'] ?? 'A+');
    $allergies = trim($data['allergies'] ?? 'None');
    $prescriptionDoc = trim($data['prescription_doc'] ?? '');
    $profileImage = trim($data['profile_image'] ?? '');

    try {
        // Ensure profile exists
        $stmt = $pdo->prepare("SELECT * FROM patient_profiles WHERE user_id = :user_id LIMIT 1");
        $stmt->execute([':user_id' => $userId]);
        $profile = $stmt->fetch();

        $patientUid = $profile['patient_uid'] ?? '';
        if (empty($patientUid)) {
            $year = date('Y');
            $patientUid = "MC-PAT-{$year}-" . str_pad($userId, 4, '0', STR_PAD_LEFT);
        }

        // Keep existing profile image if not provided in update
        if (empty($profileImage) && !empty($profile['profile_image'])) {
            $profileImage = $profile['profile_image'];
        }

        $upd = $pdo->prepare("UPDATE patient_profiles SET 
            patient_uid = :patient_uid,
            profile_image = :profile_image,
            date_of_birth = :dob,
            gender = :gender,
            phone = :phone,
            address = :address,
            blood_group = :blood_group,
            allergies = :allergies,
            prescription_doc = :prescription_doc,
            is_completed = 1
            WHERE user_id = :user_id");

        $upd->execute([
            ':patient_uid' => $patientUid,
            ':profile_image' => $profileImage,
            ':dob' => $dob ?: null,
            ':gender' => $gender,
            ':phone' => $phone,
            ':address' => $address,
            ':blood_group' => $bloodGroup,
            ':allergies' => $allergies,
            ':prescription_doc' => $prescriptionDoc,
            ':user_id' => $userId
        ]);

        // Also update DOB, gender, address in 'user' table
        try {
            $updUser = $pdo->prepare("UPDATE `user` SET DOB = :dob, gender = :gender, address = :address WHERE user_id = :user_id");
            $updUser->execute([
                ':dob' => $dob ?: null,
                ':gender' => $gender,
                ':address' => $address,
                ':user_id' => $userId
            ]);
        } catch (Exception $e) {}

        // Also update phone in 'user_phone' table
        if (!empty($phone)) {
            try {
                $pdo->prepare("INSERT INTO user_phone (user_id, phone) VALUES (:user_id, :phone) ON DUPLICATE KEY UPDATE phone = :phone2")
                    ->execute([':user_id' => $userId, ':phone' => $phone, ':phone2' => $phone]);
            } catch (Exception $e) {}
        }


        // If prescription uploaded as file or text, also add to prescriptions table
        if (!empty($prescriptionDoc)) {
            $title = "Uploaded Record - " . date('M d, Y');
            $insPresc = $pdo->prepare("INSERT INTO prescriptions (user_id, title, doctor_name, hospital, date_str, file_data) VALUES (:user_id, :title, 'Self / Direct Upload', 'Patient Vault', :date_str, :file_data)");
            $insPresc->execute([
                ':user_id' => $userId,
                ':title' => $title,
                ':date_str' => date('M d, Y'),
                ':file_data' => $prescriptionDoc
            ]);
        }

        // Return updated state
        $stmt->execute([':user_id' => $userId]);
        $updatedProfile = $stmt->fetch();

        echo json_encode([
            "success" => true,
            "message" => "Patient profile completed successfully!",
            "patient_uid" => $patientUid,
            "profile" => $updatedProfile
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $e->getMessage()
        ]);
    }
    exit();
}
