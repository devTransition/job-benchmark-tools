<?php

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo "use POST";
}

$postdata = file_get_contents("php://input");

$indata = json_decode($postdata, true);

$payload = $indata['data'];
$payload['echo'] = true;

header('Content-Type: application/json');

if (isset($payload['delay'])) {
    if ($payload['delay'] > 30000) {
        $payload['delay'] = 30000;
    }
    usleep($payload['delay'] * 1000);
}

if (isset($payload['size'])) {
    $payload['dummy'] = str_repeat("B", $payload['size']);
}


echo json_encode(array('data' => $payload));