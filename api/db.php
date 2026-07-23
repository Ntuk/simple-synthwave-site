<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function json_out($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function json_error(string $msg, int $code = 400): void {
    json_out(['error' => $msg], $code);
}

function require_admin(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['admin'])) {
        json_error('Not authorized', 401);
    }
}

// Returns the ordered content blocks for a trip. Trips created before the
// ordered-block model have no trip_blocks rows, so we synthesize blocks from
// the legacy body + trip_images so old trips still render and can be edited.
function trip_blocks(PDO $pdo, array $t): array {
    $stmt = $pdo->prepare('SELECT type, text, filename FROM trip_blocks WHERE trip_id = ? ORDER BY position, id');
    $stmt->execute([$t['id']]);
    $rows = $stmt->fetchAll();

    if (empty($rows)) {
        $legacy = [];
        if (!empty($t['body'])) {
            $legacy[] = ['type' => 'text', 'text' => $t['body']];
        }
        $imgStmt = $pdo->prepare('SELECT filename FROM trip_images WHERE trip_id = ? ORDER BY sort_order, id');
        $imgStmt->execute([$t['id']]);
        foreach ($imgStmt->fetchAll(PDO::FETCH_COLUMN) as $fn) {
            $legacy[] = ['type' => 'image', 'filename' => $fn];
        }
        $rows = $legacy;
    }

    return array_map(function ($r) {
        if ($r['type'] === 'image') {
            return ['type' => 'image', 'filename' => $r['filename'], 'url' => UPLOAD_URL . '/' . $r['filename']];
        }
        return ['type' => 'text', 'text' => $r['text'] ?? ''];
    }, $rows);
}

function format_trip(PDO $pdo, array $t): array {
    $blocks = trip_blocks($pdo, $t);

    $cover = null;
    if (!empty($t['cover'])) {
        $cover = UPLOAD_URL . '/' . $t['cover'];
    } else {
        foreach ($blocks as $b) {
            if ($b['type'] === 'image') {
                $cover = $b['url'];
                break;
            }
        }
    }

    return [
        'id' => (int) $t['id'],
        'slug' => $t['slug'],
        'title' => $t['title'],
        'location' => $t['location'],
        'month' => (int) $t['month'],
        'year' => (int) $t['year'],
        'cover' => $cover,
        'blocks' => $blocks,
        'createdAt' => $t['created_at'],
    ];
}

// All image filenames a trip currently references (blocks + legacy gallery).
function trip_referenced_files(PDO $pdo, int $tripId): array {
    $stmt = $pdo->prepare('SELECT filename FROM trip_blocks WHERE trip_id = ? AND type = "image" AND filename IS NOT NULL');
    $stmt->execute([$tripId]);
    $a = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare('SELECT filename FROM trip_images WHERE trip_id = ?');
    $stmt->execute([$tripId]);
    $b = $stmt->fetchAll(PDO::FETCH_COLUMN);

    return array_values(array_unique(array_merge($a, $b)));
}

function insert_block(PDOStatement $s, int $tripId, int $position, string $type, ?string $text, ?string $filename): void {
    $s->bindValue(1, $tripId, PDO::PARAM_INT);
    $s->bindValue(2, $position, PDO::PARAM_INT);
    $s->bindValue(3, $type);
    $s->bindValue(4, $text, $text === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $s->bindValue(5, $filename, $filename === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $s->execute();
}

// Persist an ordered list of blocks for a trip and return the cover filename.
// $blocks is the decoded JSON payload; $newFiles is the ordered list of
// freshly uploaded filenames that image blocks reference by `imageRef` index.
function write_blocks(PDO $pdo, int $tripId, array $blocks, array $newFiles): ?string {
    $insert = $pdo->prepare('INSERT INTO trip_blocks (trip_id, position, type, text, filename) VALUES (?, ?, ?, ?, ?)');
    $cover = null;
    $position = 0;

    foreach ($blocks as $block) {
        $type = $block['type'] ?? '';
        if ($type === 'text') {
            $text = trim((string) ($block['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            insert_block($insert, $tripId, $position++, 'text', $text, null);
        } elseif ($type === 'image') {
            $filename = $block['filename'] ?? null;
            if ($filename === null && isset($block['imageRef'])) {
                $filename = $newFiles[(int) $block['imageRef']] ?? null;
            }
            if ($filename === null) {
                continue;
            }
            insert_block($insert, $tripId, $position++, 'image', null, $filename);
            if ($cover === null) {
                $cover = $filename;
            }
        }
    }

    return $cover;
}

function make_slug(PDO $pdo, string $title): string {
    $base = strtolower($title);
    $base = preg_replace('/[^a-z0-9]+/', '-', $base);
    $base = trim($base, '-');
    if ($base === '') {
        $base = 'trip';
    }
    $slug = $base;
    $i = 2;
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM trips WHERE slug = ?');
    while (true) {
        $stmt->execute([$slug]);
        if ((int) $stmt->fetchColumn() === 0) {
            return $slug;
        }
        $slug = $base . '-' . $i++;
    }
}

function save_uploads(): array {
    $saved = [];
    if (empty($_FILES['images'])) {
        return $saved;
    }

    if (!is_dir(UPLOAD_DIR)) {
        @mkdir(UPLOAD_DIR, 0755, true);
    }

    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $maxSize = 8 * 1024 * 1024; // 8 MB
    $finfo = new finfo(FILEINFO_MIME_TYPE);

    $files = $_FILES['images'];
    $count = is_array($files['name']) ? count($files['name']) : 0;
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) {
            continue;
        }
        if ($files['size'][$i] > $maxSize) {
            continue;
        }
        $tmp = $files['tmp_name'][$i];
        $mime = $finfo->file($tmp);
        if (!isset($allowed[$mime])) {
            continue;
        }
        $name = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
        $dest = UPLOAD_DIR . '/' . $name;
        if (move_uploaded_file($tmp, $dest)) {
            $saved[] = $name;
        }
    }
    return $saved;
}
