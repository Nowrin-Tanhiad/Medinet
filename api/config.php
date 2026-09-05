<?php
// Enable CORS and JSON response headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$dbname = 'bangladesh_healthcare';
$user = 'root';
$pass = '';

try {
    // Connect to MySQL server
    $pdoWithoutDB = new PDO("mysql:host=$host", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Auto-detect existing databases (bangladesh_database vs bangladesh_healthcare)
    $dbs = $pdoWithoutDB->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('bangladesh_database', $dbs)) {
        $dbname = 'bangladesh_database';
    } else {
        $pdoWithoutDB->exec("CREATE DATABASE IF NOT EXISTS `bangladesh_healthcare` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $dbname = 'bangladesh_healthcare';
    }
    
    // Connect to target database
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // 1. user table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `user` (
        `user_id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `email` VARCHAR(150) NOT NULL UNIQUE,
        `password` VARCHAR(255) NOT NULL,
        `user_status` ENUM('PATIENT', 'DOCTOR', 'ADMIN') NOT NULL DEFAULT 'PATIENT',
        `DOB` DATE DEFAULT NULL,
        `gender` VARCHAR(20) DEFAULT NULL,
        `address` VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. medical_point table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `medical_point` (
        `hospital_id` INT AUTO_INCREMENT PRIMARY KEY,
        `registration_no` VARCHAR(100) NOT NULL UNIQUE,
        `name` VARCHAR(150) NOT NULL,
        `address` VARCHAR(255) DEFAULT NULL,
        `email` VARCHAR(150) DEFAULT NULL,
        `rating` DECIMAL(3,2) DEFAULT 0.00,
        `type` ENUM('PUBLIC','PRIVATE','DIAGNOSTIC') NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 3. branch table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `branch` (
        `b_id` INT AUTO_INCREMENT PRIMARY KEY,
        `hospital_id` INT NOT NULL,
        `name` VARCHAR(150) NOT NULL,
        `address` VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 4. services table (Relational database service master table)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `services` (
        `s_id` INT AUTO_INCREMENT PRIMARY KEY,
        `hospital_id` INT NOT NULL,
        `s_name` VARCHAR(150) NOT NULL,
        `floor_no` VARCHAR(20) DEFAULT NULL,
        `fees` DECIMAL(10,2) DEFAULT NULL,
        `room_no` VARCHAR(30) DEFAULT NULL,
        `building_no` VARCHAR(30) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 5. doctor table (Relational doctor profiles)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `doctor` (
        `user_id` INT PRIMARY KEY,
        `specialist` VARCHAR(100) DEFAULT NULL,
        `rating` DECIMAL(3,2) DEFAULT 0.00,
        `schedule` VARCHAR(255) DEFAULT NULL,
        `quality` VARCHAR(100) DEFAULT NULL,
        `experience_year` INT DEFAULT NULL,
        `license_no` VARCHAR(100) UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 6. patient table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `patient` (
        `user_id` INT PRIMARY KEY
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 7. admin table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `admin` (
        `user_id` INT PRIMARY KEY
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 8. referrals table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `referrals` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `from_doctor` VARCHAR(150) NOT NULL,
        `to_doctor` VARCHAR(150) NOT NULL,
        `patient_name` VARCHAR(150) NOT NULL,
        `patient_details` VARCHAR(255) DEFAULT NULL,
        `reason` TEXT NOT NULL,
        `status` ENUM('Accepted', 'In Review', 'Completed') NOT NULL DEFAULT 'In Review',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 9. room_bookings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `room_bookings` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `hospital` VARCHAR(150) NOT NULL,
        `ward` VARCHAR(100) NOT NULL,
        `room_number` VARCHAR(50) NOT NULL,
        `date_range` VARCHAR(100) NOT NULL,
        `user_name` VARCHAR(150) DEFAULT NULL,
        `user_phone` VARCHAR(50) DEFAULT NULL,
        `status` ENUM('Booked', 'Pending', 'Cancelled') NOT NULL DEFAULT 'Booked',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 10. diagnostic_bookings table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `diagnostic_bookings` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `service_name` VARCHAR(150) NOT NULL,
        `price` INT DEFAULT 0,
        `user_name` VARCHAR(150) DEFAULT NULL,
        `user_phone` VARCHAR(50) DEFAULT NULL,
        `status` ENUM('Confirmed', 'Pending', 'Completed') NOT NULL DEFAULT 'Confirmed',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `booking_date` VARCHAR(50) DEFAULT NULL,
        `serial_number` VARCHAR(50) DEFAULT NULL,
        `test_location` VARCHAR(255) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 11. diagnostic_services master table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `diagnostic_services` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `category` VARCHAR(100) DEFAULT 'General',
        `provider_hospital` VARCHAR(150) NOT NULL,
        `subtitle` VARCHAR(255) DEFAULT NULL,
        `price` INT DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `test_location` VARCHAR(255) DEFAULT 'Diagnostic Wing, 2nd Floor, Room 204'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 12. contact_inquiries table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `contact_inquiries` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `phone` VARCHAR(50) NOT NULL,
        `category` VARCHAR(100) DEFAULT 'General',
        `message` TEXT NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 13. patient_profiles table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `patient_profiles` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL UNIQUE,
        `patient_uid` VARCHAR(50) NOT NULL UNIQUE,
        `profile_image` LONGTEXT DEFAULT NULL,
        `date_of_birth` DATE DEFAULT NULL,
        `gender` VARCHAR(20) DEFAULT NULL,
        `phone` VARCHAR(50) DEFAULT NULL,
        `address` TEXT DEFAULT NULL,
        `blood_group` VARCHAR(10) DEFAULT 'A+',
        `allergies` VARCHAR(150) DEFAULT 'None',
        `prescription_doc` LONGTEXT DEFAULT NULL,
        `is_completed` TINYINT(1) DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 14. appointments table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `appointments` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT DEFAULT NULL,
        `doctor_name` VARCHAR(150) NOT NULL,
        `specialty` VARCHAR(100) NOT NULL,
        `hospital` VARCHAR(150) NOT NULL,
        `appointment_date` VARCHAR(50) NOT NULL,
        `appointment_time` VARCHAR(50) NOT NULL,
        `patient_name` VARCHAR(150) DEFAULT NULL,
        `serial_number` VARCHAR(50) DEFAULT NULL,
        `doctor_chamber` VARCHAR(255) DEFAULT NULL,
        `status` ENUM('Confirmed', 'Pending', 'Completed', 'Cancelled') DEFAULT 'Confirmed',
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 15. prescriptions table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `prescriptions` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `title` VARCHAR(150) NOT NULL,
        `doctor_name` VARCHAR(150) NOT NULL,
        `hospital` VARCHAR(150) NOT NULL,
        `date_str` VARCHAR(50) NOT NULL,
        `file_data` LONGTEXT DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 16. reviews table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `reviews` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT DEFAULT NULL,
        `user_name` VARCHAR(150) DEFAULT 'Anonymous Patient',
        `target_name` VARCHAR(150) NOT NULL,
        `target_type` VARCHAR(50) NOT NULL DEFAULT 'doctor',
        `rating` INT DEFAULT 5,
        `comment` TEXT DEFAULT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 17. hospitals table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `hospitals` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL UNIQUE,
        `location` VARCHAR(150) NOT NULL,
        `rating` FLOAT DEFAULT 4.8,
        `total_reviews` INT DEFAULT 120
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 18. doctors table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `doctors` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(150) NOT NULL,
        `specialty` VARCHAR(100) NOT NULL,
        `hospital` VARCHAR(150) NOT NULL,
        `experience` VARCHAR(50) DEFAULT '10+ Years',
        `rating` FLOAT DEFAULT 4.9,
        `total_reviews` INT DEFAULT 85,
        `doctor_chamber` VARCHAR(255) DEFAULT 'Building A, 3rd Floor, Room 302'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Safely add missing columns to existing DB tables if created previously
    try { $pdo->exec("ALTER TABLE `reviews` ADD COLUMN `user_name` VARCHAR(150) DEFAULT 'Anonymous Patient';"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `reviews` MODIFY COLUMN `target_type` VARCHAR(50) NOT NULL DEFAULT 'doctor';"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `appointments` ADD COLUMN `patient_name` VARCHAR(150) DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `appointments` ADD COLUMN `serial_number` VARCHAR(50) DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `appointments` ADD COLUMN `doctor_chamber` VARCHAR(255) DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `diagnostic_bookings` ADD COLUMN `booking_date` VARCHAR(50) DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `diagnostic_bookings` ADD COLUMN `serial_number` VARCHAR(50) DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `diagnostic_bookings` ADD COLUMN `test_location` VARCHAR(255) DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `doctors` ADD COLUMN `doctor_chamber` VARCHAR(255) DEFAULT 'Building A, 3rd Floor, Room 302';"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `doctor` ADD COLUMN `doctor_chamber` VARCHAR(255) DEFAULT 'Building A, 4th Floor, Room 405';"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `diagnostic_services` ADD COLUMN `test_location` VARCHAR(255) DEFAULT 'Diagnostic Wing, 2nd Floor, Room 204';"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `user` ADD COLUMN `profile_image` LONGTEXT DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `doctors` ADD COLUMN `profile_image` LONGTEXT DEFAULT NULL;"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE `doctor` ADD COLUMN `profile_image` LONGTEXT DEFAULT NULL;"); } catch (PDOException $e) {}

    // Seed master hospitals if empty
    $hospCheck = $pdo->query("SELECT COUNT(*) FROM `hospitals`")->fetchColumn();
    if ($hospCheck == 0) {
        $pdo->exec("INSERT INTO `hospitals` (`name`, `location`, `rating`, `total_reviews`) VALUES
            ('City Hospital, Dhaka', 'Dhanmondi, Dhaka', 4.8, 142),
            ('Square Hospital, Dhaka', 'Panthapath, Dhaka', 4.9, 310),
            ('Evercare Hospital, Dhaka', 'Bashundhara, Dhaka', 4.9, 280),
            ('United Hospital, Dhaka', 'Gulshan, Dhaka', 4.7, 195),
            ('Dhaka Medical College Hospital', 'Bakshibazar, Dhaka', 4.6, 520);");
    }

    // Seed master doctors if empty or fewer than 10
    $docCheck = $pdo->query("SELECT COUNT(*) FROM `doctors`")->fetchColumn();
    if ($docCheck < 10) {
        $pdo->exec("INSERT INTO `doctors` (`name`, `specialty`, `hospital`, `experience`, `rating`, `total_reviews`, `doctor_chamber`) VALUES
            ('Dr. Nusrat Jahan', 'Cardiologist', 'City Hospital, Dhaka', '12 Years', 4.9, 94, 'Building A, 3rd Floor, Room 302'),
            ('Dr. Ahmed Rahman', 'Neurologist', 'Square Hospital, Dhaka', '15 Years', 4.8, 112, 'Building A, 3rd Floor, Room 302'),
            ('Dr. Farhana Islam', 'Pediatrician', 'Evercare Hospital, Dhaka', '8 Years', 4.9, 78, 'Building A, 3rd Floor, Room 302'),
            ('Dr. Shakil Ahmed', 'Orthopedic Surgeon', 'United Hospital, Dhaka', '14 Years', 4.7, 65, 'Building A, 3rd Floor, Room 302'),
            ('Dr. Tawhidul Islam', 'General Physician', 'Dhaka Medical College Hospital', '10 Years', 4.8, 140, 'Building A, 3rd Floor, Room 302'),
            ('Dr. Arifa Sultana', 'Gynecologist', 'Square Hospital, Dhaka', '11 Years', 4.9, 105, 'Building B, 2nd Floor, Room 201'),
            ('Dr. Sajjad Hossain', 'Psychiatrist', 'Evercare Hospital, Dhaka', '9 Years', 4.8, 88, 'Building C, 4th Floor, Room 410'),
            ('Dr. Rehana Parveen', 'Dermatologist', 'City Hospital, Dhaka', '7 Years', 4.7, 62, 'Building A, 1st Floor, Room 105'),
            ('Dr. Mahmudul Hasan', 'Cardiologist', 'United Hospital, Dhaka', '16 Years', 4.9, 130, 'Building B, 3rd Floor, Room 305'),
            ('Dr. Selina Chowdhury', 'Pediatrician', 'Dhaka Medical College Hospital', '13 Years', 4.8, 95, 'Building A, 2nd Floor, Room 208'),
            ('Dr. Monir Hossain', 'Psychologist', 'Evercare Hospital, Dhaka', '6 Years', 4.8, 70, 'Building D, 2nd Floor, Room 202');");
    }

    // Ensure sequential serial numbers per doctor for appointments missing serials
    try {
        $unassigned = $pdo->query("SELECT id, doctor_name FROM `appointments` WHERE `serial_number` IS NULL OR `serial_number` = ''")->fetchAll();
        foreach ($unassigned as $uApp) {
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `appointments` WHERE doctor_name = :doc AND id <= :id");
            $countStmt->execute([':doc' => $uApp['doctor_name'], ':id' => $uApp['id']]);
            $seq = $countStmt->fetchColumn() ?: 1;
            $slStr = "SL-" . str_pad($seq, 2, '0', STR_PAD_LEFT);
            $upd = $pdo->prepare("UPDATE `appointments` SET `serial_number` = :sl WHERE `id` = :id");
            $upd->execute([':sl' => $slStr, ':id' => $uApp['id']]);
        }
    } catch (PDOException $e) {}

    // Seed dummy doctor account requested by user: Dr. Tanhiad (tanhiad@mail.com / 123456)
    $drCheck = $pdo->prepare("SELECT user_id FROM `user` WHERE email = 'tanhiad@mail.com'");
    $drCheck->execute();
    $existingDrUser = $drCheck->fetch();

    if (!$existingDrUser) {
        $hashedPass = password_hash('123456', PASSWORD_BCRYPT);
        $userStmt = $pdo->prepare("INSERT INTO `user` (`name`, `email`, `password`, `user_status`, `address`) VALUES (:name, :email, :password, 'DOCTOR', :address)");
        $userStmt->execute([
            ':name' => 'Dr. Tanhiad',
            ':email' => 'tanhiad@mail.com',
            ':password' => $hashedPass,
            ':address' => 'Dhaka Medical College Hospital, Dhaka'
        ]);
        $drUserId = $pdo->lastInsertId();

        try {
            $docStmt = $pdo->prepare("INSERT INTO `doctor` (`user_id`, `specialist`, `rating`, `schedule`, `quality`, `experience_year`, `license_no`) VALUES (:user_id, :specialist, :rating, 'Sat - Thu: 9:00 AM - 5:00 PM', 'Senior Consultant', 5, 'BMDC-99201') ON DUPLICATE KEY UPDATE specialist = :specialist2");
            $docStmt->execute([
                ':user_id' => $drUserId,
                ':specialist' => 'Neurosurgeon',
                ':rating' => 4.6,
                ':specialist2' => 'Neurosurgeon'
            ]);
        } catch (PDOException $e) {}

        try {
            $doctorsStmt = $pdo->prepare("INSERT INTO `doctors` (`name`, `specialty`, `hospital`, `experience`, `rating`, `total_reviews`, `doctor_chamber`) VALUES (:name, :specialty, :hospital, :experience, :rating, 95, 'Building A, 4th Floor, Room 405') ON DUPLICATE KEY UPDATE specialty = :specialty2");
            $doctorsStmt->execute([
                ':name' => 'Dr. Tanhiad',
                ':specialty' => 'Neurosurgeon',
                ':hospital' => 'Dhaka Medical College Hospital',
                ':experience' => '5 Years',
                ':rating' => 4.6,
                ':specialty2' => 'Neurosurgeon'
            ]);
        } catch (PDOException $e) {}
    } else {
        // Ensure user_status is DOCTOR and password is reset to 123456
        $hashedPass = password_hash('123456', PASSWORD_BCRYPT);
        $updUser = $pdo->prepare("UPDATE `user` SET `password` = :password, `user_status` = 'DOCTOR' WHERE `email` = 'tanhiad@mail.com'");
        $updUser->execute([':password' => $hashedPass]);
        
        // Ensure in doctors table and update schedule for late night testing (1:30 AM - 11:00 PM)
        $doctorsCheck = $pdo->query("SELECT id FROM `doctors` WHERE name LIKE '%Tanhiad%'")->fetch();
        if (!$doctorsCheck) {
            $pdo->exec("INSERT INTO `doctors` (`name`, `specialty`, `hospital`, `experience`, `rating`, `total_reviews`, `doctor_chamber`) VALUES
                ('Dr. Tanhiad', 'Neurosurgeon', 'Dhaka Medical College Hospital', '5 Years (1:30 AM - 11:00 PM)', 4.6, 95, 'Building A, 4th Floor, Room 405');");
        }
        try {
            $pdo->exec("UPDATE `doctor` SET `schedule` = 'Sat - Thu: 1:30 AM - 11:00 PM' WHERE `user_id` IN (SELECT `user_id` FROM `user` WHERE `email` = 'tanhiad@mail.com');");
        } catch (PDOException $e) {}
    }

    // Seed default Admin account requested by user: admin@medinet.com / admin@mail.com (password: 123456)
    $adminEmails = ['admin@medinet.com', 'admin@mail.com'];
    foreach ($adminEmails as $admEmail) {
        $admCheck = $pdo->prepare("SELECT user_id FROM `user` WHERE email = :email");
        $admCheck->execute([':email' => $admEmail]);
        $existingAdmUser = $admCheck->fetch();

        $hashedAdminPass = password_hash('123456', PASSWORD_BCRYPT);
        if (!$existingAdmUser) {
            $admUserStmt = $pdo->prepare("INSERT INTO `user` (`name`, `email`, `password`, `user_status`, `address`) VALUES (:name, :email, :password, 'ADMIN', :address)");
            $admUserStmt->execute([
                ':name' => 'System Administrator',
                ':email' => $admEmail,
                ':password' => $hashedAdminPass,
                ':address' => 'Dhaka Medical College Hospital Administration Wing'
            ]);
            $adminUserId = $pdo->lastInsertId();
            try {
                $pdo->prepare("INSERT IGNORE INTO `admin` (`user_id`) VALUES (:user_id)")->execute([':user_id' => $adminUserId]);
            } catch (PDOException $e) {}
        } else {
            $updAdmin = $pdo->prepare("UPDATE `user` SET `password` = :password, `user_status` = 'ADMIN' WHERE `email` = :email");
            $updAdmin->execute([':password' => $hashedAdminPass, ':email' => $admEmail]);
            try {
                $pdo->prepare("INSERT IGNORE INTO `admin` (`user_id`) VALUES (:user_id)")->execute([':user_id' => $existingAdmUser['user_id']]);
            } catch (PDOException $e) {}
        }
    }

    // Seed default Patient account: patient@medinet.com (password: 123456)
    $patEmail = 'patient@medinet.com';
    $patCheck = $pdo->prepare("SELECT user_id FROM `user` WHERE email = :email");
    $patCheck->execute([':email' => $patEmail]);
    $existingPatUser = $patCheck->fetch();
    $hashedPatPass = password_hash('123456', PASSWORD_BCRYPT);

    if (!$existingPatUser) {
        $patUserStmt = $pdo->prepare("INSERT INTO `user` (`name`, `email`, `password`, `user_status`, `address`) VALUES (:name, :email, :password, 'PATIENT', :address)");
        $patUserStmt->execute([
            ':name' => 'Anisur Rahman',
            ':email' => $patEmail,
            ':password' => $hashedPatPass,
            ':address' => 'House 42, Road 7, Dhanmondi, Dhaka'
        ]);
        $patUserId = $pdo->lastInsertId();
        try {
            $pdo->prepare("INSERT IGNORE INTO `patient` (`user_id`) VALUES (:user_id)")->execute([':user_id' => $patUserId]);
        } catch (PDOException $e) {}

        $year = date('Y');
        $patUid = "MC-PAT-{$year}-" . str_pad($patUserId, 4, '0', STR_PAD_LEFT);
        try {
            $pdo->prepare("INSERT IGNORE INTO `patient_profiles` (`user_id`, `patient_uid`, `blood_group`, `is_completed`) VALUES (:user_id, :patient_uid, 'O+', 1)")
                ->execute([':user_id' => $patUserId, ':patient_uid' => $patUid]);
        } catch (PDOException $e) {}
    } else {
        $updPat = $pdo->prepare("UPDATE `user` SET `password` = :password, `user_status` = 'PATIENT' WHERE `email` = :email");
        $updPat->execute([':password' => $hashedPatPass, ':email' => $patEmail]);
    }

    // Seed medical points if empty
    $mpCheck = $pdo->query("SELECT COUNT(*) FROM `medical_point`")->fetchColumn();
    if ($mpCheck == 0) {
        $pdo->exec("INSERT INTO `medical_point` (`hospital_id`, `registration_no`, `name`, `address`, `email`, `rating`, `type`) VALUES
            (1, 'DGHS-001', 'Dhaka Medical Center', 'Dhaka, Bangladesh', 'info@dhakamedical.com', 4.50, 'PUBLIC'),
            (2, 'DGHS-PUB-001', 'Dhaka Medical College & Hospital', 'Ramna, Dhaka-1000', 'info@dmch.gov.bd', 4.70, 'PUBLIC'),
            (3, 'DGHS-PRI-101', 'Square Hospital Ltd.', '18/F West Panthapath, Dhaka', 'info@squarehospital.com', 4.90, 'PRIVATE'),
            (4, 'DGHS-DIA-201', 'Labaid Diagnostic & Specialized Hospital', 'House 06, Road 04, Dhanmondi, Dhaka', 'info@labaidgroup.com', 4.80, 'DIAGNOSTIC'),
            (5, 'DGHS-PUB-002', 'Chattogram General Hospital', 'Anderkilla, Chattogram', 'info@cgh.gov.bd', 4.30, 'PUBLIC'),
            (6, 'DGHS-PRI-102', 'United Hospital Dhaka', 'Plot 15, Road 71, Gulshan-2, Dhaka', 'info@unicare.com', 4.80, 'PRIVATE'),
            (7, 'DGHS-DIA-202', 'Popular Diagnostic Centre', 'House 16, Road 2, Dhanmondi, Dhaka', 'info@populardiagnostic.com', 4.60, 'DIAGNOSTIC');");
    }

    // Seed initial reviews if empty
    $revCheck = $pdo->query("SELECT COUNT(*) FROM `reviews`")->fetchColumn();
    if ($revCheck == 0) {
        $pdo->exec("INSERT INTO `reviews` (`user_name`, `target_name`, `target_type`, `rating`, `comment`) VALUES
            ('Kamal Hossain', 'City Hospital, Dhaka', 'hospital', 5, 'Excellent room service and clean cabins. Doctors are very attentive.'),
            ('Rina Begum', 'Dr. Nusrat Jahan', 'doctor', 5, 'Very patient listener and accurate diagnosis for heart pain.'),
            ('Tariqul Islam', 'Square Hospital, Dhaka', 'hospital', 4, 'Great diagnostic facilities, fast report delivery.');");
    }

    // Seed master diagnostic services if empty
    $diagCheck = $pdo->query("SELECT COUNT(*) FROM `diagnostic_services`")->fetchColumn();
    if ($diagCheck == 0) {
        $pdo->exec("INSERT INTO `diagnostic_services` (`name`, `category`, `provider_hospital`, `subtitle`, `price`) VALUES
            ('Complete Blood Count (CBC)', 'Blood Test', 'City Hospital, Dhaka', 'Full Blood & Hemoglobin Panel', 650),
            ('Blood Sugar (HbA1c & Fasting)', 'Blood Test', 'Square Hospital, Dhaka', 'Diabetes & Sugar Monitoring', 1100),
            ('Lipid Profile Test', 'Blood Test', 'Popular Diagnostic Center', 'Cholesterol & Triglyceride Analysis', 1400),
            ('Liver Function Test (LFT)', 'Blood Test', 'Labaid Specialized Hospital', 'Bilirubin & Enzyme Screening', 1800),
            ('Brain & Head MRI Scan (1.5T)', 'MRI Scan', 'Square Hospital, Dhaka', 'High-Definition Brain Scan', 7500),
            ('Whole Body MRI Scan', 'MRI Scan', 'Evercare Hospital, Dhaka', 'Advanced Full-Body Imaging', 14500),
            ('Chest Digital X-Ray (PA View)', 'X-Ray', 'United Hospital, Dhaka', 'Digital High-Resolution X-Ray', 1200),
            ('CT Scan of Brain & Head', 'CT Scan', 'Dhaka Medical College Hospital', 'High-Speed 128-Slice CT', 5500),
            ('2D Echo Cardiac Sonogram', 'Cardiology', 'City Hospital, Dhaka', 'Color Doppler Echocardiogram', 3500),
            ('Whole Abdomen Ultrasonography (USG)', 'Ultrasonography', 'Square Hospital, Dhaka', 'Abdominal & Pelvic Scan', 2200);");
    }

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database Connection Failed: " . $e->getMessage()
    ]);
    exit();
}
