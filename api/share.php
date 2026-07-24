<?php
// Serves the SPA shell for /travels/<slug> with that trip's metadata baked in.
//
// Facebook, LinkedIn and Slack do not run JavaScript, so setting the title from
// React never reaches them. Everyone gets this same response rather than only
// crawlers: no user-agent sniffing, no risk of serving search engines something
// different from visitors, and React takes over as usual once it boots.
require_once __DIR__ . '/db.php';

const SITE_ORIGIN = 'https://nicotukiainen.com';

$indexPath = __DIR__ . '/../index.html';
$html = @file_get_contents($indexPath);
if ($html === false) {
    http_response_code(500);
    exit('Missing index.html');
}

// Replace the content="..." of a single meta tag, matching on its identifying
// attribute. Uses a callback so $-sequences in the value are never treated as
// backreferences.
function set_meta(string $html, string $attr, string $name, string $value): string {
    $pattern = '~(<meta\s+' . $attr . '="' . preg_quote($name, '~') . '"\s+content=")([^"]*)(")~i';
    return preg_replace_callback(
        $pattern,
        fn($m) => $m[1] . htmlspecialchars($value, ENT_QUOTES) . $m[3],
        $html,
        1
    ) ?? $html;
}

function drop_meta(string $html, string $attr, string $name): string {
    $pattern = '~\s*<meta\s+' . $attr . '="' . preg_quote($name, '~') . '"[^>]*>~i';
    return preg_replace($pattern, '', $html, 1) ?? $html;
}

$slug = (string) ($_GET['slug'] ?? '');
$trip = null;

if ($slug !== '') {
    try {
        $stmt = db()->prepare('SELECT * FROM trips WHERE slug = ?');
        $stmt->execute([$slug]);
        $row = $stmt->fetch();
        if ($row) {
            $trip = array_change_key_case($row, CASE_LOWER);
        }
    } catch (Throwable $e) {
        // Fall through to the untouched shell rather than 500 a crawler.
    }
}

if ($trip) {
    $months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
               'July', 'August', 'September', 'October', 'November', 'December'];
    $month = $months[(int) $trip['month']] ?? '';
    $when = trim($month . ' ' . (int) $trip['year']);

    $title = $trip['title'] . ' — Travels — Nico Tukiainen';
    $desc = trim($trip['location'] . ($when !== '' ? ', ' . $when : '')) . '. A travel log from Nico Tukiainen.';
    $url = SITE_ORIGIN . '/travels/' . rawurlencode($trip['slug']);

    $html = preg_replace('~<title>.*?</title>~is', '<title>' . htmlspecialchars($title, ENT_QUOTES) . '</title>', $html, 1);
    $html = set_meta($html, 'name', 'description', $desc);
    $html = set_meta($html, 'property', 'og:title', $title);
    $html = set_meta($html, 'property', 'og:description', $desc);
    $html = set_meta($html, 'property', 'og:url', $url);
    $html = set_meta($html, 'property', 'og:type', 'article');
    $html = set_meta($html, 'name', 'twitter:title', $title);
    $html = set_meta($html, 'name', 'twitter:description', $desc);
    $html = preg_replace('~(<link\s+rel="canonical"\s+href=")[^"]*(")~i', '${1}' . $url . '${2}', $html, 1) ?? $html;

    // Use the trip's own cover when it has one. That's a photo of unknown
    // proportions, so the 1200x630 hints from the default card would be a lie.
    if (!empty($trip['cover'])) {
        $image = SITE_ORIGIN . UPLOAD_URL . '/' . $trip['cover'];
        $html = set_meta($html, 'property', 'og:image', $image);
        $html = set_meta($html, 'name', 'twitter:image', $image);
        $html = set_meta($html, 'property', 'og:image:alt', $trip['title']);
        $html = drop_meta($html, 'property', 'og:image:width');
        $html = drop_meta($html, 'property', 'og:image:height');
    }
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
