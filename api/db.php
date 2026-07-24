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

// Start the session with the cookie flags set explicitly. Admin actions are
// authorised by this cookie alone, so SameSite is what stops another site
// POSTing to the API on your behalf.
function start_session(): void {
    if (session_status() !== PHP_SESSION_NONE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'secure' => $https,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function require_admin(): void {
    start_session();
    if (empty($_SESSION['admin'])) {
        json_error('Not authorized', 401);
    }
}

// ---- Login throttling -------------------------------------------------------
// One password guards write access to the whole site, and the endpoint is
// public, so cap how fast it can be guessed. State lives in a temp file per IP:
// no schema change, and losing it on a server wipe is harmless.

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_SECONDS = 900;   // failures older than this stop counting
const LOGIN_LOCKOUT_SECONDS = 900;  // how long a lockout lasts

function login_state_file(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return sys_get_temp_dir() . '/nt_login_' . sha1($ip) . '.json';
}

function login_read_state(): array {
    $raw = @file_get_contents(login_state_file());
    $data = $raw === false ? null : json_decode($raw, true);
    return is_array($data) ? $data : ['count' => 0, 'first' => 0, 'until' => 0];
}

// Refuses the request outright while a lockout is in force.
function login_guard(): void {
    $s = login_read_state();
    if (($s['until'] ?? 0) > time()) {
        $wait = $s['until'] - time();
        header('Retry-After: ' . $wait);
        json_error('Too many attempts. Try again in ' . ceil($wait / 60) . ' minutes.', 429);
    }
}

function login_record_failure(): void {
    $s = login_read_state();
    $now = time();
    if ($now - ($s['first'] ?? 0) > LOGIN_WINDOW_SECONDS) {
        $s = ['count' => 0, 'first' => $now, 'until' => 0];
    }
    $s['count'] = ($s['count'] ?? 0) + 1;
    if ($s['count'] >= LOGIN_MAX_ATTEMPTS) {
        $s['until'] = $now + LOGIN_LOCKOUT_SECONDS;
    }
    @file_put_contents(login_state_file(), json_encode($s), LOCK_EX);
}

function login_clear_failures(): void {
    @unlink(login_state_file());
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
    // This DB has the columns named MONTH/YEAR in uppercase, and PHP array keys
    // are case-sensitive, so normalize the row before reading fields by name.
    $t = array_change_key_case($t, CASE_LOWER);
    $blocks = trip_blocks($pdo, $t);

    $cover = null;
    if (!empty($t['cover'])) {
        // Prefer the small thumbnail. Trips uploaded before thumbnails existed
        // have none, so fall back to the full image.
        $thumb = thumb_name($t['cover']);
        $cover = UPLOAD_URL . '/' . (is_file(UPLOAD_DIR . '/' . $thumb) ? $thumb : $t['cover']);
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

// Long edge, in pixels, for the stored image and its list thumbnail.
const MAX_IMAGE_EDGE = 1920;
const THUMB_IMAGE_EDGE = 640;

// Thumbnails live beside the original: photo.jpg -> photo_t.jpg.
function thumb_name(string $name): string {
    $dot = strrpos($name, '.');
    return substr($name, 0, $dot) . '_t' . substr($name, $dot);
}

// Read an image, scale it so its long edge fits $maxEdge, and write it out.
// Phones upload 4-6 MB originals that were being served to visitors untouched.
function write_scaled(string $src, string $dest, string $mime, int $maxEdge, int $quality): bool {
    if (!function_exists('imagecreatetruecolor')) {
        return false;
    }

    $size = @getimagesize($src);
    // A truecolour canvas costs ~4 bytes a pixel twice over, so bail on anything
    // huge rather than exhaust memory_limit mid-request.
    if (!$size || $size[0] * $size[1] > 40000000) {
        return false;
    }

    switch ($mime) {
        case 'image/jpeg': $im = @imagecreatefromjpeg($src); break;
        case 'image/png':  $im = @imagecreatefrompng($src); break;
        case 'image/webp': $im = @imagecreatefromwebp($src); break;
        default: return false;
    }
    if (!$im) {
        return false;
    }

    // Phone photos record rotation in EXIF rather than in the pixels, and GD
    // drops that on re-encode, so apply it here or portraits come out sideways.
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($src);
        $orientation = $exif['Orientation'] ?? 0;
        if ($orientation === 3) {
            $im = imagerotate($im, 180, 0);
        } elseif ($orientation === 6) {
            $im = imagerotate($im, -90, 0);
        } elseif ($orientation === 8) {
            $im = imagerotate($im, 90, 0);
        }
    }

    $w = imagesx($im);
    $h = imagesy($im);
    $scale = min(1, $maxEdge / max($w, $h));
    $nw = max(1, (int) round($w * $scale));
    $nh = max(1, (int) round($h * $scale));

    $out = imagecreatetruecolor($nw, $nh);
    if ($mime === 'image/png' || $mime === 'image/webp') {
        imagealphablending($out, false);
        imagesavealpha($out, true);
    }
    imagecopyresampled($out, $im, 0, 0, 0, 0, $nw, $nh, $w, $h);

    $ok = false;
    if ($mime === 'image/jpeg') {
        $ok = imagejpeg($out, $dest, $quality);
    } elseif ($mime === 'image/png') {
        $ok = imagepng($out, $dest, 6);
    } elseif ($mime === 'image/webp') {
        $ok = imagewebp($out, $dest, $quality);
    }

    imagedestroy($im);
    imagedestroy($out);
    return $ok;
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
            // Downscale in place, then build the list thumbnail from the result.
            // If GD is missing both calls no-op and the original is served, which
            // is exactly the old behaviour.
            write_scaled($dest, $dest, $mime, MAX_IMAGE_EDGE, 82);
            write_scaled($dest, UPLOAD_DIR . '/' . thumb_name($name), $mime, THUMB_IMAGE_EDGE, 78);
            $saved[] = $name;
        }
    }
    return $saved;
}
