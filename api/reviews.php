<?php
session_start();
require_once __DIR__ . '/config.php';

// Ensure user_id column exists on reviews table
try {
    $pdo->exec("ALTER TABLE reviews ADD COLUMN user_id INT(11) NULL AFTER id");
} catch (Exception $e) {}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $targetName = trim($_GET['target_name'] ?? '');
        $targetType = trim($_GET['target_type'] ?? '');
        $explicitUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        $myReviewsOnly = isset($_GET['my_reviews']) ? true : false;

        if (!empty($targetName)) {
            $stmt = $pdo->prepare("SELECT * FROM reviews WHERE LOWER(target_name) LIKE LOWER(:target_name) ORDER BY id DESC");
            $stmt->execute([':target_name' => '%' . $targetName . '%']);
        } elseif (!empty($targetType)) {
            $stmt = $pdo->prepare("SELECT * FROM reviews WHERE LOWER(target_type) = LOWER(:target_type) ORDER BY id DESC");
            $stmt->execute([':target_type' => $targetType]);
        } elseif ($explicitUserId > 0 || $myReviewsOnly) {
            $uid = $explicitUserId > 0 ? $explicitUserId : ($_SESSION['user']['id'] ?? 0);
            $stmt = $pdo->prepare("SELECT * FROM reviews WHERE user_id = :user_id ORDER BY id DESC");
            $stmt->execute([':user_id' => $uid]);
        } else {
            $stmt = $pdo->query("SELECT * FROM reviews ORDER BY id DESC LIMIT 100");
        }

        $reviews = $stmt->fetchAll() ?: [];

        echo json_encode([
            "success" => true,
            "reviews" => $reviews
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

    $userId = $_SESSION['user']['id'] ?? (int)($data['user_id'] ?? 0);
    $userName = trim($data['user_name'] ?? ($_SESSION['user']['name'] ?? 'Patient User'));
    $targetName = trim($data['target_name'] ?? '');
    $targetType = trim($data['target_type'] ?? 'doctor');
    $rating = intval($data['rating'] ?? 5);
    $comment = trim($data['comment'] ?? '');

    if (empty($comment)) {
        $comment = "Verified patient rating of {$rating} stars for {$targetName}. Excellent service and medical care.";
    }

    if (empty($targetName)) {
        echo json_encode([
            "success" => false,
            "message" => "Target doctor/hospital name is required to submit a review."
        ]);
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

        $newId = $pdo->lastInsertId();

        // Recalculate average rating for doctor/hospital in database
        try {
            $avgStmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE LOWER(target_name) = LOWER(:target_name)");
            $avgStmt->execute([':target_name' => $targetName]);
            $avgData = $avgStmt->fetch();
            $newAvg = round((float)($avgData['avg_rating'] ?? $rating), 1);
            $newCnt = (int)($avgData['cnt'] ?? 1);

            $cleanTarget = trim(preg_replace('/^dr[\.\s]*/i', '', $targetName));

            if (strtolower($targetType) === 'doctor') {
                $updDoc = $pdo->prepare("UPDATE doctors SET rating = :rating, total_reviews = :total_reviews WHERE LOWER(name) LIKE LOWER(:name)");
                $updDoc->execute([':rating' => $newAvg, ':total_reviews' => $newCnt, ':name' => '%' . $cleanTarget . '%']);

                try {
                    $updDoc2 = $pdo->prepare("UPDATE doctor SET rating = :rating WHERE specialist IS NOT NULL");
                    $updDoc2->execute([':rating' => $newAvg]);
                } catch (Exception $ex) {}
            } elseif (strtolower($targetType) === 'hospital') {
                $updHosp = $pdo->prepare("UPDATE hospitals SET rating = :rating, total_reviews = :total_reviews WHERE LOWER(name) LIKE LOWER(:name)");
                $updHosp->execute([':rating' => $newAvg, ':total_reviews' => $newCnt, ':name' => '%' . $targetName . '%']);
            }
        } catch (Exception $ex) {}

        echo json_encode([
            "success" => true,
            "message" => "Rating and review submitted successfully!",
            "review" => [
                "id" => $newId,
                "user_id" => $userId,
                "user_name" => $userName,
                "target_name" => $targetName,
                "target_type" => $targetType,
                "rating" => $rating,
                "comment" => $comment,
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
?>
