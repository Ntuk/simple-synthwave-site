<?php
require_once __DIR__ . '/db.php';
session_start();

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'check':
        json_out(['authenticated' => !empty($_SESSION['admin'])]);

    case 'login':
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $password = (string) ($body['password'] ?? '');
        if (ADMIN_PASSWORD_HASH !== '' && password_verify($password, ADMIN_PASSWORD_HASH)) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            json_out(['authenticated' => true]);
        }
        json_error('Invalid password', 401);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        json_out(['authenticated' => false]);

    default:
        json_error('Unknown action', 404);
}
