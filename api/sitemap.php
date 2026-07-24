<?php
// Served at /sitemap.xml via a rewrite in .htaccess. Generated rather than
// static so new trips show up without anyone remembering to edit a file.
require_once __DIR__ . '/db.php';

const SITE_ORIGIN = 'https://nicotukiainen.com';

header('Content-Type: application/xml; charset=utf-8');

$urls = [
    ['loc' => SITE_ORIGIN . '/', 'priority' => '1.0', 'changefreq' => 'monthly'],
    ['loc' => SITE_ORIGIN . '/travels', 'priority' => '0.8', 'changefreq' => 'weekly'],
];

try {
    $rows = db()->query('SELECT slug, created_at FROM trips ORDER BY year DESC, month DESC, id DESC')->fetchAll();
    foreach ($rows as $row) {
        $urls[] = [
            'loc' => SITE_ORIGIN . '/travels/' . rawurlencode($row['slug']),
            'lastmod' => !empty($row['created_at']) ? date('Y-m-d', strtotime($row['created_at'])) : null,
            'priority' => '0.6',
            'changefreq' => 'yearly',
        ];
    }
} catch (Throwable $e) {
    // A database hiccup shouldn't return a broken document to a crawler. Ship
    // the static routes and let it come back for the rest.
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach ($urls as $u) {
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($u['loc'], ENT_XML1) . "</loc>\n";
    if (!empty($u['lastmod'])) {
        echo '    <lastmod>' . $u['lastmod'] . "</lastmod>\n";
    }
    echo '    <changefreq>' . $u['changefreq'] . "</changefreq>\n";
    echo '    <priority>' . $u['priority'] . "</priority>\n";
    echo "  </url>\n";
}
echo '</urlset>' . "\n";
