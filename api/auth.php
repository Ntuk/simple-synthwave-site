<?php
require_once __DIR__ . '/db.php';
start_session();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'check':
        json_out(['authenticated' => !empty($_SESSION['admin'])]);

    case 'login':
        // Refuse before doing any work if this IP is already locked out.
        login_guard();

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $password = (string) ($body['password'] ?? '');
        if (ADMIN_PASSWORD_HASH !== '' && password_verify($password, ADMIN_PASSWORD_HASH)) {
            login_clear_failures();
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            json_out(['authenticated' => true]);
        }
        login_record_failure();
        json_error('Invalid password', 401);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        json_out(['authenticated' => false]);

    default:
        json_error('Unknown action', 404);
}
