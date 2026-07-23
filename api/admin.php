<?php
require_once __DIR__ . '/db.php';
require_admin();

$pdo = db();
$action = $_GET['action'] ?? '';

if ($action === 'create' || $action === 'update') {
    $title = trim($_POST['title'] ?? '');
    $location = trim($_POST['location'] ?? '');
    $month = (int) ($_POST['month'] ?? 0);
    $year = (int) ($_POST['year'] ?? 0);

    if ($title === '' || $location === '' || $month < 1 || $month > 12 || $year < 1970) {
        json_error('Missing or invalid fields');
    }

    $blocks = json_decode($_POST['blocks'] ?? '[]', true);
    if (!is_array($blocks)) {
        json_error('Invalid blocks');
    }

    $newFiles = save_uploads(); // freshly uploaded filenames, in order

    if ($action === 'create') {
        $slug = make_slug($pdo, $title);
        $stmt = $pdo->prepare('INSERT INTO trips (slug, title, location, month, year) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$slug, $title, $location, $month, $year]);
        $tripId = (int) $pdo->lastInsertId();
    } else {
        $tripId = (int) ($_GET['id'] ?? 0);
        if ($tripId < 1) {
            json_error('Invalid id');
        }
        // Remember what was referenced before, to delete files that get dropped.
        $before = trip_referenced_files($pdo, $tripId);

        $stmt = $pdo->prepare('UPDATE trips SET title = ?, location = ?, month = ?, year = ? WHERE id = ?');
        $stmt->execute([$title, $location, $month, $year, $tripId]);

        // Old trips may still hold legacy gallery rows; blocks now own the content.
        $pdo->prepare('DELETE FROM trip_blocks WHERE trip_id = ?')->execute([$tripId]);
        $pdo->prepare('DELETE FROM trip_images WHERE trip_id = ?')->execute([$tripId]);
    }

    $cover = write_blocks($pdo, $tripId, $blocks, $newFiles);
    $pdo->prepare('UPDATE trips SET cover = ? WHERE id = ?')->execute([$cover, $tripId]);

    if ($action === 'update') {
        // Delete image files no longer referenced by the trip.
        $after = trip_referenced_files($pdo, $tripId);
        foreach (array_diff($before, $after) as $orphan) {
            $path = UPLOAD_DIR . '/' . $orphan;
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    $stmt = $pdo->prepare('SELECT * FROM trips WHERE id = ?');
    $stmt->execute([$tripId]);
    json_out(format_trip($pdo, $stmt->fetch()));
}

if ($action === 'delete') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id < 1) {
        json_error('Invalid id');
    }

    foreach (trip_referenced_files($pdo, $id) as $filename) {
        $path = UPLOAD_DIR . '/' . $filename;
        if (is_file($path)) {
            @unlink($path);
        }
    }

    $pdo->prepare('DELETE FROM trip_blocks WHERE trip_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM trip_images WHERE trip_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM trips WHERE id = ?')->execute([$id]);
    json_out(['deleted' => true]);
}

json_error('Unknown action', 404);
