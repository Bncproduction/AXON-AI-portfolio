Add-Type -AssemblyName System.Drawing

$width  = 2480
$height = 3508

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode    = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

$bg     = [System.Drawing.Color]::FromArgb(255, 10, 11, 14)
$cAmber = [System.Drawing.Color]::FromArgb(255, 255, 165, 60)
$cBlue  = [System.Drawing.Color]::FromArgb(255, 100, 180, 255)
$cGrid  = [System.Drawing.Color]::FromArgb(255, 28, 32, 40)
$cDim   = [System.Drawing.Color]::FromArgb(255, 55, 62, 78)
$cWhite = [System.Drawing.Color]::FromArgb(255, 215, 222, 235)

$g.Clear($bg)

$bAmber = New-Object System.Drawing.SolidBrush($cAmber)
$bBlue  = New-Object System.Drawing.SolidBrush($cBlue)
$bWhite = New-Object System.Drawing.SolidBrush($cWhite)
$bDim   = New-Object System.Drawing.SolidBrush($cDim)
$pGrid  = New-Object System.Drawing.Pen($cGrid, 1)
$pAmber = New-Object System.Drawing.Pen($cAmber, 2)
$pDim   = New-Object System.Drawing.Pen($cDim, 1)

$fontDir = "C:\Users\Prakash-PDI\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\7e193e03-b007-4652-8512-0cb261d5f170\3ac53384-a45c-4d71-bd20-22865eec1774\skills\canvas-design\canvas-fonts"
$pfc = New-Object System.Drawing.Text.PrivateFontCollection
$fontFiles = @("GeistMono-Regular","GeistMono-Bold","IBMPlexMono-Regular","IBMPlexMono-Bold","BricolageGrotesque-Regular","BricolageGrotesque-Bold","Jura-Light","WorkSans-Regular")
foreach ($f in $fontFiles) {
    $fp = "$fontDir\$f.ttf"
    if (Test-Path $fp) { $pfc.AddFontFile($fp) }
}

$fMono = $pfc.Families | Where-Object { $_.Name -like "*Geist*" }        | Select-Object -First 1
$fIBM  = $pfc.Families | Where-Object { $_.Name -like "*IBM Plex Mono*" } | Select-Object -First 1
$fDisp = $pfc.Families | Where-Object { $_.Name -like "*Bricolage*" }    | Select-Object -First 1
$fJura = $pfc.Families | Where-Object { $_.Name -like "*Jura*" }         | Select-Object -First 1
if (-not $fMono) { $fMono = [System.Drawing.FontFamily]::new("Courier New") }
if (-not $fIBM)  { $fIBM  = [System.Drawing.FontFamily]::new("Courier New") }
if (-not $fDisp) { $fDisp = [System.Drawing.FontFamily]::new("Arial") }
if (-not $fJura) { $fJura = [System.Drawing.FontFamily]::new("Arial") }

function DT { param($txt, $fam, $sz, $sty, $br, $x, $y)
    $font = New-Object System.Drawing.Font($fam, $sz, $sty, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawString($txt, $font, $br, [float]$x, [float]$y)
    $font.Dispose()
}
function MT { param($txt, $fam, $sz, $sty)
    $font = New-Object System.Drawing.Font($fam, $sz, $sty, [System.Drawing.GraphicsUnit]::Pixel)
    $result = $g.MeasureString($txt, $font)
    $font.Dispose()
    return $result
}

# Grid
for ($x = 0; $x -lt $width; $x += 60)  { $g.DrawLine($pGrid, $x, 0, $x, $height) }
for ($y = 0; $y -lt $height; $y += 60) { $g.DrawLine($pGrid, 0, $y, $width, $y) }

# Ghost arc glow from top-center
$cx = [int]($width / 2)
$radii = @(1600, 2000, 2500, 3000)
foreach ($r in $radii) {
    $a = [int](18 - $r/220)
    if ($a -lt 3) { $a = 3 }
    $cp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($a, 255, 165, 60), 80)
    $g.DrawEllipse($cp, [float]($cx - $r), [float](-$r), [float]($r*2), [float]($r*2))
    $cp.Dispose()
}

# Dot matrix field
for ($dx = 180; $dx -lt ($width - 180); $dx += 72) {
    for ($dy = 180; $dy -lt 1000; $dy += 72) {
        $dist  = [math]::Sqrt( ($dx-$cx)*($dx-$cx) + ($dy-500)*($dy-500) )
        $alpha = [int](200 * [math]::Exp(-$dist/900))
        if ($alpha -gt 8) {
            $db = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha,255,165,60))
            $g.FillEllipse($db, [float]($dx-2.5), [float]($dy-2.5), 5.0, 5.0)
            $db.Dispose()
        }
    }
}

# Border rules
$g.DrawLine($pAmber, 120, 120, ($width-120), 120)
$g.DrawLine($pAmber, 120, 120, 120, ($height-120))
$g.DrawLine($pDim,   ($width-120), 120, ($width-120), ($height-120))
$g.DrawLine($pDim,   120, ($height-120), ($width-120), ($height-120))

# Tick marks
$tp = New-Object System.Drawing.Pen($cAmber, 1.5)
for ($i = 0; $i -le 40; $i++) {
    $ty = 120 + [int]($i * ($height-240)/40)
    $tl = if ($i % 5 -eq 0) { 24 } else { 8 }
    $g.DrawLine($tp, 120, $ty, (120+$tl), $ty)
}
$tp.Dispose()

# Column numbers top
$clb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50,215,222,235))
$step = [int](($width-300)/8)
for ($li = 0; $li -lt 8; $li++) {
    $lx = 165 + $li*$step
    $num = "{0:D2}" -f ($li+1)
    DT $num $fIBM 26 ([System.Drawing.FontStyle]::Regular) $clb $lx 80
}
$clb.Dispose()

# Titles
DT "CLAUDE" $fDisp 320 ([System.Drawing.FontStyle]::Bold) $bAmber 148 260
DT "CODE"   $fDisp 320 ([System.Drawing.FontStyle]::Bold) $bBlue  560 570

# Subtitle
$sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(110,215,222,235))
DT "COMPLETE  GUIDE" $fJura 60 ([System.Drawing.FontStyle]::Regular) $sb 152 920
$sb.Dispose()

# Rule below title
$rp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55,255,165,60),1)
$g.DrawLine($rp, 148, 1000, ($width-148), 1000)
$rp.Dispose()

# Scan-line field (signal noise in upper band)
for ($sy = 150; $sy -lt 1000; $sy += 5) {
    $dist2 = [math]::Abs($sy - 550)
    $salpha = [int](14 * [math]::Exp(-$dist2/220))
    if ($salpha -gt 1) {
        $sp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($salpha,100,180,255),0.8)
        $g.DrawLine($sp, 148, $sy, ($width-148), $sy)
        $sp.Dispose()
    }
}

# Cold blue accent horizontal bar (mid-composition)
$barColor = [System.Drawing.Color]::FromArgb(18, 100, 180, 255)
$g.FillRectangle((New-Object System.Drawing.SolidBrush($barColor)), [float]148, [float]1695, [float]($width-296), [float]4)

# Ghost watermark
$wb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10,255,165,60))
DT ">" $fDisp 2200 ([System.Drawing.FontStyle]::Bold) $wb 480 1100
$wb.Dispose()

# Content lines
$cb  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(75,215,222,235))
$cab = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170,255,165,60))

$lines = New-Object System.Collections.ArrayList
[void]$lines.Add("  [ SIGNAL MAP ]  //  ANTHROPIC  CLI  AGENTIC  CONTEXT  TOOLS")
[void]$lines.Add("")
[void]$lines.Add("  * ARCHITECTURE     context --> tool_use --> loop --> output")
[void]$lines.Add("  * SLASH COMMANDS   /help  /clear  /model  /compact  /review")
[void]$lines.Add("  * PERMISSIONS      allow  deny  hooks  settings.json")
[void]$lines.Add("  * MCP SERVERS      tool_search  deferred  schema  invoke")
[void]$lines.Add("  * MEMORY           user  feedback  project  reference")
[void]$lines.Add("")
[void]$lines.Add("  01  authentication  ...............................  ANTHROPIC_API_KEY")
[void]$lines.Add("  02  model selection  ................  claude-sonnet-4-6  opus-4-8")
[void]$lines.Add("  03  tool hierarchy  ..........  Read  Edit  Write  Bash  Glob  Grep")
[void]$lines.Add("  04  agent delegation  .................  subagent_type  isolation")
[void]$lines.Add("  05  context management  ...........  compaction  /compact  tokens")
[void]$lines.Add("  06  hook system  .............  pre-tool  post-tool  stop  notify")
[void]$lines.Add("  07  security model  ..............  sandbox  permissions  trust")
[void]$lines.Add("  08  workflow patterns  ..........  plan  act  verify  commit")

$ly = 1060
foreach ($line in $lines) {
    if ($line -match "^\s+0[0-9]") {
        DT $line $fIBM 36 ([System.Drawing.FontStyle]::Regular) $cab 148 $ly
    } else {
        DT $line $fIBM 36 ([System.Drawing.FontStyle]::Regular) $cb 148 $ly
    }
    $ly += 68
}
$cb.Dispose()
$cab.Dispose()

# Dividers
$hp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(22,215,222,235),1)
$divs = @(1700, 2140, 2620, 3040)
foreach ($hy in $divs) {
    $g.DrawLine($hp, 148, $hy, ($width-148), $hy)
}
$hp.Dispose()

# Manifesto lines (ASCII only)
$mb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(75,215,222,235))
$manifestoLines = New-Object System.Collections.ArrayList
[void]$manifestoLines.Add("The invisible logic of computation,")
[void]$manifestoLines.Add("rendered visible / mapped with the")
[void]$manifestoLines.Add("care of a master cartographer.")
$mmy2 = 2730
foreach ($ml in $manifestoLines) {
    DT $ml $fJura 54 ([System.Drawing.FontStyle]::Regular) $mb 148 $mmy2
    $mmy2 += 78
}
$mb.Dispose()

# Metadata bottom-right
$mtb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(42,215,222,235))
$metaItems = New-Object System.Collections.ArrayList
[void]$metaItems.Add("SIGNAL  ARCHITECTURE")
[void]$metaItems.Add("anthropic  2026  A/01")
[void]$metaItems.Add("claude-sonnet-4-6")
$mmy3 = $height - 270
foreach ($ml in $metaItems) {
    $msz = MT $ml $fIBM 30 ([System.Drawing.FontStyle]::Regular)
    $mmx = ($width - 148) - [int]$msz.Width
    DT $ml $fIBM 30 ([System.Drawing.FontStyle]::Regular) $mtb $mmx $mmy3
    $mmy3 += 46
}
$mtb.Dispose()

# Version
$vb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55,255,165,60))
DT "v.2026.06" $fIBM 30 ([System.Drawing.FontStyle]::Regular) $vb 148 ($height-224)
$vb.Dispose()

# Cursor
$g.FillRectangle($bAmber, [float]($width-195), [float]($height-196), 38.0, 5.0)

# Corner crosses
$xp = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(38,255,165,60),1)
$corners = @( @(120,120), @($width-120,120), @(120,$height-120), @($width-120,$height-120) )
foreach ($c in $corners) {
    $ix = $c[0]; $iy = $c[1]
    $g.DrawLine($xp, ($ix-10), $iy, ($ix+10), $iy)
    $g.DrawLine($xp, $ix, ($iy-10), $ix, ($iy+10))
}
$xp.Dispose()

# Save
$out = "C:\Users\Prakash-PDI\Desktop\Claude projects\Design\claude-code-canvas.png"
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$pfc.Dispose()
Write-Host "Saved: $out"
