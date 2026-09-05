<?php
session_start();
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $targetName = trim($_GET['target_name'] ?? '');
        $targetType = trim($_GET['target_type'] ?? '');
        
        if (!empty($targetName)) {
            $stmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings FROM reviews WHERE target_name = :target_name");
            $stmt->execute([':target_name' => $targetName]);
            $stats = $stmt->fetch();

            $listStmt = $pdo->prepare("SELECT id, user_name, rating, comment, created_at FROM reviews WHERE target_name = :target_name ORDER BY id DESC");
            $listStmt->execute([':target_name' => $targetName]);
            $ratingsList = $listStmt->fetchAll() ?: [];

            echo json_encode([
                "success" => true,
                "target_name" => $targetName,
                "average_rating" => round((float)($stats['avg_rating'] ?? 5.0), 1),
                "total_ratings" => (int)($stats['total_ratings'] ?? 0),
                "ratings" => $ratingsList
            ]);
        } else {
            $docRatings = $pdo->query("SELECT name, rating, total_reviews FROM doctors ORDER BY rating DESC")->fetchAll();
            $hospRatings = $pdo->query("SELECT name, rating, total_reviews FROM hospitals ORDER BY rating DESC")->fetchAll();

            echo json_encode([
                "success" => true,
                "doctor_ratings" => $docRatings ?: [],
                "hospital_ratings" => $hospRatings ?: []
            ]);
        }
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

    $userId = $_SESSION['user']['id'] ?? (int)($data['user_id'] ?? 0);
    $userName = trim($data['user_name'] ?? ($_SESSION['user']['name'] ?? 'Patient User'));
    $targetName = trim($data['target_name'] ?? '');
    $targetType = trim($data['target_type'] ?? 'doctor');
    $rating = max(1, min(5, intval($data['rating'] ?? 5)));
    $comment = trim($data['comment'] ?? 'Automated service rating');

    if (empty($targetName)) {
        echo json_encode(["success" => false, "message" => "Target name required."]);
        exit();
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO reviews (user_id, user_name, target_name, target_type, rating, comment) VALUES (:user_id, :user_name, :target_name, :target_type, :rating, :comment)");
        $stmt->execute([
            ':user_id' => $userId > 0 ? $userId : null,
            ':user_name' => $userName,
            ':target_name' => $targetName,
            ':target_type' => $targetType,
            ':rating' => $rating,
            ':comment' => $comment
        ]);

        // Recalculate average rating for doctor/hospital
        $avgStmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE target_name = :target_name");
        $avgStmt->execute([':target_name' => $targetName]);
        $avgData = $avgStmt->fetch();
        $newAvg = round((float)($avgData['avg_rating'] ?? $rating), 1);
        $newCnt = (int)($avgData['cnt'] ?? 1);

        if ($targetType === 'doctor') {
            $updDoc = $pdo->prepare("UPDATE doctors SET rating = :rating, total_reviews = :total_reviews WHERE name = :name");
            $updDoc->execute([':rating' => $newAvg, ':total_reviews' => $newCnt, ':name' => $targetName]);
        } else {
            $updHosp = $pdo->prepare("UPDATE hospitals SET rating = :rating, total_reviews = :total_reviews WHERE name = :name");
            $updHosp->execute([':rating' => $newAvg, ':total_reviews' => $newCnt, ':name' => $targetName]);
        }

        echo json_encode([
            "success" => true,
            "message" => "Rating updated successfully!",
            "rating" => [
                "target_name" => $targetName,
                "rating" => $rating,
                "new_average" => $newAvg,
                "total_ratings" => $newCnt
            ]
        ]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit();
}
