<?php
require_once "../db.php";

$sql = "SELECT * FROM resources WHERE 1=1";
$params = [];

if ($_GET['board']) { $sql.= " AND board =?"; $params[] = $_GET['board']; }
if ($_GET['cls']) { $sql.= " AND class =?"; $params[] = $_GET['cls']; }
if ($_GET['subject']) { $sql.= " AND subject =?"; $params[] = $_GET['subject']; }

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
echo json_encode(["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
?>