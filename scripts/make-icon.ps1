Add-Type -AssemblyName System.Drawing

$sizes = 16, 24, 32, 48, 64, 128, 256
$pngs = @()

foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = [Math]::Max(1, [int]($s * 0.03))
  $rect = New-Object System.Drawing.RectangleF $pad, $pad, ($s - 2 * $pad), ($s - 2 * $pad)

  # Outer ring: browser-style blue/purple gradient.
  $outer = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(37, 99, 235)), ([System.Drawing.Color]::FromArgb(124, 58, 237)), 45
  $g.FillEllipse($outer, $rect)

  # Inner white ring and blue centre, like a browser icon.
  $ringInset = $s * 0.17
  $ring = New-Object System.Drawing.RectangleF ($rect.X + $ringInset), ($rect.Y + $ringInset), ($rect.Width - 2 * $ringInset), ($rect.Height - 2 * $ringInset)
  $g.FillEllipse([System.Drawing.Brushes]::White, $ring)
  $coreInset = $s * 0.06
  $core = New-Object System.Drawing.RectangleF ($ring.X + $coreInset), ($ring.Y + $coreInset), ($ring.Width - 2 * $coreInset), ($ring.Height - 2 * $coreInset)
  $inner = New-Object System.Drawing.Drawing2D.LinearGradientBrush $core, ([System.Drawing.Color]::FromArgb(14, 165, 233)), ([System.Drawing.Color]::FromArgb(37, 99, 235)), 90
  $g.FillEllipse($inner, $core)

  # White plane in the centre.
  $font = New-Object System.Drawing.Font 'Segoe UI Symbol', ([float]($core.Height * 0.62)), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = 'Center'
  $fmt.LineAlignment = 'Center'
  $g.DrawString([string][char]0x2708, $font, [System.Drawing.Brushes]::White, $core, $fmt)

  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $pngs += , $ms.ToArray()
}

# Build an ICO container holding the PNG images.
$out = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter $out
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $len = $pngs[$i].Length
  $dim = if ($s -ge 256) { 0 } else { $s }
  $w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$len); $w.Write([UInt32]$offset)
  $offset += $len
}
foreach ($p in $pngs) { $w.Write($p) }
$w.Flush()

$dest = Join-Path $PSScriptRoot '..\assets\app.ico'
[System.IO.File]::WriteAllBytes($dest, $out.ToArray())
[System.IO.File]::WriteAllBytes((Join-Path $PSScriptRoot '..\assets\app-preview.png'), $pngs[-1])
Write-Output "Icon written to $dest"
