param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$selectedPort = 8000
$listener = $null

while ($selectedPort -le 8010) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $selectedPort)
    $listener.Start()
    break
  } catch {
    $listener = $null
    $selectedPort++
  }
}

if (-not $listener) {
  throw 'Nenhuma porta disponível entre 8000 e 8010.'
}

$siteUrl = "http://127.0.0.1:$selectedPort/"
Write-Host ''
Write-Host 'DICIONÁRIO CONTÁBIL | GRUPO INOVE' -ForegroundColor Cyan
Write-Host "Acesse: $siteUrl" -ForegroundColor Green
Write-Host 'Mantenha esta janela aberta enquanto estiver usando o dicionário.'
Write-Host 'Para encerrar, feche esta janela ou pressione Ctrl+C.'
Write-Host ''

if (-not $NoBrowser) {
  Start-Process $siteUrl
}

$contentTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      while ($true) {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) { break }
      }

      $requestParts = $requestLine.Split(' ')
      if ($requestParts.Count -lt 2 -or $requestParts[0] -notin @('GET', 'HEAD')) {
        $status = '405 Method Not Allowed'
        $body = [System.Text.Encoding]::UTF8.GetBytes('Método não permitido')
        $mime = 'text/plain; charset=utf-8'
      } else {
        $requestPath = $requestParts[1].Split('?')[0]
        $requestPath = [System.Uri]::UnescapeDataString($requestPath)
        if ($requestPath -eq '/') { $requestPath = '/index.html' }
        $relativePath = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relativePath))

        if (-not $filePath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
          $status = '403 Forbidden'
          $body = [System.Text.Encoding]::UTF8.GetBytes('Acesso negado')
          $mime = 'text/plain; charset=utf-8'
        } elseif (-not [System.IO.File]::Exists($filePath)) {
          $status = '404 Not Found'
          $body = [System.Text.Encoding]::UTF8.GetBytes('Arquivo não encontrado')
          $mime = 'text/plain; charset=utf-8'
        } else {
          $status = '200 OK'
          $body = [System.IO.File]::ReadAllBytes($filePath)
          $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
          $mime = if ($contentTypes.ContainsKey($extension)) { $contentTypes[$extension] } else { 'application/octet-stream' }
        }
      }

      $headers = "HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($requestParts[0] -ne 'HEAD') {
        $stream.Write($body, 0, $body.Length)
      }
      $stream.Flush()
    } catch {
      Write-Warning "Falha ao atender uma requisição: $($_.Exception.Message)"
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
