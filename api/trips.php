<?php
require_once __DIR__ . '/db.php';

$pdo = db();
$slug = $_GET['slug'] ?? null;

if ($slug !== null) {
    $stmt = $pdo->prepare('SELECT * FROM trips WHERE slug = ?');
    $stmt->execute([$slug]);
    $trip = $stmt->fetch();
    if (!$trip) {
        json_error('Trip not found', 404);
    }
    json_out(format_trip($pdo, $trip));
}

$trips = $pdo->query('SELECT * FROM trips ORDER BY year DESC, month DESC, id DESC')->fetchAll();
json_out(array_map(fn($t) => format_trip($pdo, $t), $trips));
