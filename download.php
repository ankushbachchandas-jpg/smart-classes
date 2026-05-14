<?php
$file = $_GET['file']?? '';
$filepath = "../uploads/". basename($file);

if (!file_exists($filepath)) {
  http_response_code(404);
  echo json_encode(["error" => "File not found"]);
  exit;
}

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="'. basename($file). '"');
readfile($filepath);
?>