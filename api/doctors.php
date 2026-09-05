<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';


/*
|--------------------------------------------------------------------------
| NORMALIZE TEXT
|--------------------------------------------------------------------------
| Used for comparison only.
| The original database value is still displayed to users.
*/

function normalizeText($text)
{
    $text = trim($text ?? '');

    // Convert to lowercase
    $text = mb_strtolower($text, 'UTF-8');

    // Replace punctuation with spaces
    $text = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);

    // Remove extra spaces
    $text = preg_replace('/\s+/u', ' ', $text);

    return trim($text);
}


/*
|--------------------------------------------------------------------------
| NORMALIZE DOCTOR NAME
|--------------------------------------------------------------------------
*/

function normalizeDoctorName($name)
{
    $name = normalizeText($name);

    // Remove "Dr" from beginning
    $name = preg_replace('/^dr\s+/iu', '', $name);

    return trim($name);
}


/*
|--------------------------------------------------------------------------
| GET PARAMETERS
|--------------------------------------------------------------------------
*/

$searchQuery = trim($_GET['query'] ?? '');

$specialtyFilter = trim($_GET['specialty'] ?? 'All');


try {

    /*
    |--------------------------------------------------------------------------
    | STORE ALL DOCTORS
    |--------------------------------------------------------------------------
    */

    $doctorMap = [];


    /*
    |--------------------------------------------------------------------------
    | 1. REGISTERED DOCTORS
    |--------------------------------------------------------------------------
    | Priority source
    */

    $registeredQuery = $pdo->query("
        SELECT
            d.user_id,
            u.name,
            u.email,
            u.address,

            d.specialist,
            d.rating,
            d.schedule,
            d.quality,
            d.experience_year,
            d.doctor_chamber

        FROM doctor d

        INNER JOIN `user` u
            ON d.user_id = u.user_id
    ");

    $registeredDoctors = $registeredQuery->fetchAll(PDO::FETCH_ASSOC);


    foreach ($registeredDoctors as $doctor) {

        $doctorName = trim($doctor['name'] ?? '');

        if ($doctorName === '') {
            continue;
        }


        /*
        |--------------------------------------------------------------------------
        | Create unique key
        |--------------------------------------------------------------------------
        */

        $doctorKey = normalizeDoctorName($doctorName);


        /*
        |--------------------------------------------------------------------------
        | Get specialty dynamically
        |--------------------------------------------------------------------------
        */

        $specialty = trim($doctor['specialist'] ?? '');

        if ($specialty === '') {
            $specialty = 'General Physician';
        }


        /*
        |--------------------------------------------------------------------------
        | Save doctor
        |--------------------------------------------------------------------------
        */

        $doctorMap[$doctorKey] = [

            'id' => (int)$doctor['user_id'],

            'user_id' => (int)$doctor['user_id'],

            'source' => 'user',

            'name' => $doctorName,

            'doctor_name' => $doctorName,


            'specialty' => $specialty,

            'specialist' => $specialty,


            'hospital' =>
                trim($doctor['address'] ?? '') !== ''
                    ? $doctor['address']
                    : 'Not specified',


            'doctor_address' =>
                trim($doctor['address'] ?? '') !== ''
                    ? $doctor['address']
                    : 'Not specified',


            'experience' =>
                trim((string)($doctor['experience_year'] ?? '')) !== ''
                    ? $doctor['experience_year'] . ' Years'
                    : 'Not specified',


            'experience_year' =>
                trim((string)($doctor['experience_year'] ?? '')) !== ''
                    ? $doctor['experience_year'] . ' Years'
                    : 'Not specified',


            'rating' =>
                isset($doctor['rating'])
                    ? (float)$doctor['rating']
                    : 0,


            'total_reviews' => 0,


            'doctor_chamber' =>
                trim($doctor['doctor_chamber'] ?? '') !== ''
                    ? $doctor['doctor_chamber']
                    : 'Not specified',


            'quality' =>
                trim($doctor['quality'] ?? '') !== ''
                    ? $doctor['quality']
                    : 'Doctor',


            'schedule' =>
                trim($doctor['schedule'] ?? '') !== ''
                    ? $doctor['schedule']
                    : 'Not specified'
        ];
    }



    /*
    |--------------------------------------------------------------------------
    | 2. CATALOG DOCTORS TABLE
    |--------------------------------------------------------------------------
    */

    $catalogQuery = $pdo->query("
        SELECT *
        FROM doctors
        ORDER BY rating DESC
    ");

    $catalogDoctors = $catalogQuery->fetchAll(PDO::FETCH_ASSOC);


    foreach ($catalogDoctors as $doctor) {

        $doctorName = trim($doctor['name'] ?? '');

        if ($doctorName === '') {
            continue;
        }


        $doctorKey = normalizeDoctorName($doctorName);


        /*
        |--------------------------------------------------------------------------
        | Prevent duplicate doctor
        |--------------------------------------------------------------------------
        | Registered doctor has priority.
        */

        if (isset($doctorMap[$doctorKey])) {
            continue;
        }


        /*
        |--------------------------------------------------------------------------
        | Get specialty dynamically
        |--------------------------------------------------------------------------
        */

        $specialty = trim($doctor['specialty'] ?? '');

        if ($specialty === '') {
            $specialty = 'General Physician';
        }


        $doctorMap[$doctorKey] = [

            'id' => (int)$doctor['id'],

            'source' => 'catalog',

            'name' => $doctorName,

            'doctor_name' => $doctorName,


            'specialty' => $specialty,

            'specialist' => $specialty,


            'hospital' =>
                trim($doctor['hospital'] ?? '') !== ''
                    ? $doctor['hospital']
                    : 'Not specified',


            'doctor_address' =>
                trim($doctor['hospital'] ?? '') !== ''
                    ? $doctor['hospital']
                    : 'Not specified',


            'experience' =>
                trim($doctor['experience'] ?? '') !== ''
                    ? $doctor['experience']
                    : 'Not specified',


            'experience_year' =>
                trim($doctor['experience'] ?? '') !== ''
                    ? $doctor['experience']
                    : 'Not specified',


            'rating' =>
                isset($doctor['rating'])
                    ? (float)$doctor['rating']
                    : 0,


            'total_reviews' =>
                isset($doctor['total_reviews'])
                    ? (int)$doctor['total_reviews']
                    : 0,


            'doctor_chamber' =>
                trim($doctor['doctor_chamber'] ?? '') !== ''
                    ? $doctor['doctor_chamber']
                    : 'Not specified',


            'quality' => 'Senior Consultant',


            'schedule' => 'Not specified'
        ];
    }



    /*
    |--------------------------------------------------------------------------
    | CONVERT MAP TO ARRAY
    |--------------------------------------------------------------------------
    */

    $allDoctors = array_values($doctorMap);



    /*
    |--------------------------------------------------------------------------
    | CREATE SPECIALTY LIST DYNAMICALLY
    |--------------------------------------------------------------------------
    |
    | Every specialty in database automatically appears.
    |
    */

    $specialtyMap = [];


    foreach ($allDoctors as $doctor) {

        $specialty = trim($doctor['specialty'] ?? '');

        if ($specialty === '') {
            continue;
        }


        /*
        | Normalized key prevents duplicate values caused by:
        | "Cardiology"
        | " cardiology "
        | "CARDIOLOGY"
        */

        $specialtyKey = normalizeText($specialty);


        if (!isset($specialtyMap[$specialtyKey])) {

            // Keep original display value
            $specialtyMap[$specialtyKey] = $specialty;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | Sort specialties alphabetically
    |--------------------------------------------------------------------------
    */

    natcasesort($specialtyMap);

    $uniqueSpecialties = array_values($specialtyMap);



    /*
|--------------------------------------------------------------------------
| SPECIALTY STEMMER & CATEGORY MATCHING (PHP)
|--------------------------------------------------------------------------
*/

function getSpecialtyStemPHP($text)
{
    $t = mb_strtolower(trim($text ?? ''), 'UTF-8');
    $t = preg_replace('/[&\/-]/u', ' ', $t);
    $t = preg_replace('/[^\p{L}\p{N}\s]+/u', '', $t);
    $words = preg_split('/\s+/u', $t, -1, PREG_SPLIT_NO_EMPTY);

    $stopWords = ['specialist', 'special', 'specialty', 'doctor', 'physician', 'consultant', 'care', 'center', 'clinic', 'department', 'medicine', 'general', 'and', 'the', 'for', 'surgeon'];

    $stems = [];
    foreach ($words as $w) {
        if (mb_strlen($w) <= 2) continue;
        if (in_array($w, $stopWords)) continue;

        $w = str_replace('gynaec', 'gynec', $w);
        if (strpos($w, 'cardio') !== false) { $stems[] = 'cardio'; continue; }
        if (strpos($w, 'gynec') !== false) { $stems[] = 'gynec'; continue; }
        if (strpos($w, 'pediatr') !== false) { $stems[] = 'pediatr'; continue; }
        if (strpos($w, 'ortho') !== false) { $stems[] = 'ortho'; continue; }
        if (strpos($w, 'psychol') !== false) { $stems[] = 'psychol'; continue; }
        if (strpos($w, 'psychiat') !== false) { $stems[] = 'psychiat'; continue; }
        if (strpos($w, 'neurosurg') !== false || strpos($w, 'neurosurgeon') !== false) { $stems[] = 'neurosurg'; continue; }
        if (strpos($w, 'neurol') !== false) { $stems[] = 'neurol'; continue; }
        if (strpos($w, 'dermat') !== false) { $stems[] = 'dermat'; continue; }

        $stem = preg_replace('/(ologist|ology|ogist|iatrician|iatrics|ic|ics|ist|ian|y)$/u', '', $w);
        if (mb_strlen($stem) >= 3 && !in_array($stem, $stopWords)) {
            $stems[] = $stem;
        } else if (!in_array($w, $stopWords)) {
            $stems[] = $w;
        }
    }
    return array_values(array_unique($stems));
}

function matchSpecialtyCategoryPHP($docSpecialty, $filterSpecialty)
{
    $filterNorm = normalizeText($filterSpecialty);
    if ($filterNorm === '' || $filterNorm === 'all' || $filterNorm === 'all specialties') {
        return true;
    }

    $docNorm = normalizeText($docSpecialty);
    if ($docNorm === $filterNorm) {
        return true;
    }

    $filterStems = getSpecialtyStemPHP($filterSpecialty);
    $docStems = getSpecialtyStemPHP($docSpecialty);

    if (!empty($filterStems) && !empty($docStems)) {
        foreach ($filterStems as $fs) {
            foreach ($docStems as $ds) {
                if (strpos($ds, $fs) !== false || strpos($fs, $ds) !== false) {
                    return true;
                }
            }
        }
    }

    return false;
}


/*
|--------------------------------------------------------------------------
| NORMALIZE FILTER VALUES
|--------------------------------------------------------------------------
*/

$normalizedFilter = normalizeText($specialtyFilter);

$normalizedSearch = normalizeDoctorName($searchQuery);



/*
|--------------------------------------------------------------------------
| FILTER DOCTORS
|--------------------------------------------------------------------------
*/

$filteredDoctors = array_filter(
    $allDoctors,

    function ($doctor) use (
        $normalizedFilter,
        $normalizedSearch,
        $specialtyFilter,
        $searchQuery
    ) {


        /*
        |--------------------------------------------------------------------------
        | SPECIALTY FILTER
        |--------------------------------------------------------------------------
        */

        if (
            $normalizedFilter !== '' &&
            $normalizedFilter !== 'all' &&
            $normalizedFilter !== 'all specialties'
        ) {
            if (!matchSpecialtyCategoryPHP($doctor['specialty'] ?? '', $specialtyFilter)) {
                return false;
            }
        }



        /*
        |--------------------------------------------------------------------------
        | SEARCH
        |--------------------------------------------------------------------------
        */

        if ($normalizedSearch === '') {
            return true;
        }


        $doctorName = normalizeDoctorName(
            $doctor['name'] ?? ''
        );


        $doctorSpecialty = normalizeText(
            $doctor['specialty'] ?? ''
        );

        $doctorHospital = normalizeText(
            $doctor['hospital'] ?? ''
        );

        $doctorChamber = normalizeText(
            $doctor['doctor_chamber'] ?? ''
        );


        /*
        |--------------------------------------------------------------------------
        | SEARCH DOCTOR NAME, SPECIALTY, HOSPITAL, OR CHAMBER
        |--------------------------------------------------------------------------
        */

        if (strpos($doctorName, $normalizedSearch) !== false) {
            return true;
        }

        if (strpos($doctorSpecialty, $normalizedSearch) !== false) {
            return true;
        }

        if (strpos($doctorHospital, $normalizedSearch) !== false) {
            return true;
        }

        if (strpos($doctorChamber, $normalizedSearch) !== false) {
            return true;
        }

        // Check specialty stem match if search query is a specialty keyword
        $searchStems = getSpecialtyStemPHP($searchQuery);
        $docStems = getSpecialtyStemPHP($doctor['specialty'] ?? '');
        if (!empty($searchStems) && !empty($docStems)) {
            foreach ($searchStems as $ss) {
                foreach ($docStems as $ds) {
                    if (strpos($ds, $ss) !== false || strpos($ss, $ds) !== false) {
                        return true;
                    }
                }
            }
        }


        return false;
    }
);



    /*
    |--------------------------------------------------------------------------
    | RESET ARRAY KEYS
    |--------------------------------------------------------------------------
    */

    $filteredDoctors = array_values($filteredDoctors);



    /*
    |--------------------------------------------------------------------------
    | SORT BY RATING
    |--------------------------------------------------------------------------
    */

    usort(
        $filteredDoctors,

        function ($a, $b) {

            return
                ($b['rating'] ?? 0)
                <=>
                ($a['rating'] ?? 0);
        }
    );



    /*
    |--------------------------------------------------------------------------
    | JSON RESPONSE
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        'success' => true,

        'count' => count($filteredDoctors),

        /*
        | Dynamic specialties
        */

        'specialties' => $uniqueSpecialties,


        /*
        | Filtered doctors
        */

        'doctors' => $filteredDoctors

    ], JSON_UNESCAPED_UNICODE);



} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([

        'success' => false,

        'error' => $e->getMessage()

    ]);
}

?>