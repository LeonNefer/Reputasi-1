$ErrorActionPreference = "Stop"
$rootPath = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $rootPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8123)
$listener.Start()
Write-Output "CoolSmartGames preview: http://127.0.0.1:8123/"
$crlf = [string]([char]13) + [string]([char]10)

$mimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { $client.Close(); continue }
      $requestParts = $requestLine.Split(" ")
      $method = $requestParts[0]
      $pathOnly = ([string]$requestParts[1]).Split("?")[0]
      while ($reader.ReadLine() -ne "") { }

      $relativePath = [System.Uri]::UnescapeDataString($pathOnly.TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }
      $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $relativePath))
      $insideWorkspace = $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
      $statusCode = 200
      $statusText = "OK"
      $contentType = "text/plain; charset=utf-8"
      $bytes = [byte[]]@()

      if (-not $insideWorkspace) {
        $statusCode = 403
        $statusText = "Forbidden"
      } elseif ($method -notin @("GET", "HEAD")) {
        $statusCode = 405
        $statusText = "Method Not Allowed"
      } elseif (-not [System.IO.File]::Exists($filePath)) {
        $statusCode = 404
        $statusText = "Not Found"
      } else {
        $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
        if ($mimeTypes.ContainsKey($extension)) { $contentType = $mimeTypes[$extension] }
        else { $contentType = "application/octet-stream" }
        if ($method -eq "GET") { $bytes = [System.IO.File]::ReadAllBytes($filePath) }
      }

      $head = "HTTP/1.1 " + $statusCode + " " + $statusText + $crlf +
        "Content-Type: " + $contentType + $crlf +
        "Content-Length: " + $bytes.Length + $crlf +
        "Cache-Control: no-store" + $crlf +
        "Connection: close" + $crlf + $crlf
      $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
      $stream.Write($headBytes, 0, $headBytes.Length)
      if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
      $stream.Flush()
    } catch {
      Write-Output ("Preview request failed: " + $_.Exception.Message)
    } finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
