Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$outputPath = "C:\Users\Prakash-PDI\Desktop\Claude projects\EV_Manufacturing_Website_Planning_Document.docx"
if (Test-Path $outputPath) { Remove-Item $outputPath -Force }

$tmpDir = Join-Path $env:TEMP "ev_docx_$(Get-Random)"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
New-Item -ItemType Directory -Path "$tmpDir\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$tmpDir\word" -Force | Out-Null
New-Item -ItemType Directory -Path "$tmpDir\word\_rels" -Force | Out-Null
New-Item -ItemType Directory -Path "$tmpDir\docProps" -Force | Out-Null

# ── [Content_Types].xml ────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'@ | Set-Content "$tmpDir\[Content_Types].xml" -Encoding UTF8

# ── _rels/.rels ────────────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'@ | Set-Content "$tmpDir\_rels\.rels" -Encoding UTF8

# ── docProps/core.xml ──────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>EV Manufacturing - Website Planning Document</dc:title>
  <dc:creator>Claude Code</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-05-30T00:00:00Z</dcterms:created>
</cp:coreProperties>
'@ | Set-Content "$tmpDir\docProps\core.xml" -Encoding UTF8

# ── docProps/app.xml ───────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Claude Code</Application>
</Properties>
'@ | Set-Content "$tmpDir\docProps\app.xml" -Encoding UTF8

# ── word/_rels/document.xml.rels ───────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
'@ | Set-Content "$tmpDir\word\_rels\document.xml.rels" -Encoding UTF8

# ── word/settings.xml ─────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat/>
</w:settings>
'@ | Set-Content "$tmpDir\word\settings.xml" -Encoding UTF8

# ── word/numbering.xml ────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="&#x2022;"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol"/></w:rPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="o"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>
'@ | Set-Content "$tmpDir\word\numbering.xml" -Encoding UTF8

# ── word/styles.xml ───────────────────────────────────────────────────────────
@'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="480" w:after="160"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:color w:val="1F3864"/>
      <w:sz w:val="40"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="360" w:after="120"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:color w:val="2E75B6"/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="80"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:color w:val="404040"/>
      <w:sz w:val="26"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="80"/>
      <w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>
    </w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader">
    <w:name w:val="Table Header"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr>
    <w:rPr>
      <w:b/>
      <w:color w:val="FFFFFF"/>
      <w:sz w:val="20"/>
    </w:rPr>
  </w:style>
</w:styles>
'@ | Set-Content "$tmpDir\word\styles.xml" -Encoding UTF8

# ═══════════════════════════════════════════════════════════════════════════════
# Helper functions for building XML
# ═══════════════════════════════════════════════════════════════════════════════

function para {
    param([string]$text, [string]$style = "Normal", [bool]$bold = $false, [string]$color = "", [int]$sz = 0, [bool]$center = $false, [bool]$pageBreakBefore = $false)
    $rpr = ""
    if ($bold) { $rpr += "<w:b/>" }
    if ($color) { $rpr += "<w:color w:val=`"$color`"/>" }
    if ($sz -gt 0) { $rpr += "<w:sz w:val=`"$sz`"/><w:szCs w:val=`"$sz`"/>" }
    $rprBlock = if ($rpr) { "<w:rPr>$rpr</w:rPr>" } else { "" }
    $ppr = "<w:pStyle w:val=`"$style`"/>"
    if ($center) { $ppr += "<w:jc w:val=`"center`"/>" }
    if ($pageBreakBefore) { $ppr += "<w:pageBreakBefore/>" }
    $escaped = $text -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
    return "<w:p><w:pPr>$ppr</w:pPr><w:r>$rprBlock<w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

function h1 { param([string]$t) return para $t "Heading1" }
function h2 { param([string]$t) return para $t "Heading2" }
function h3 { param([string]$t) return para $t "Heading3" }
function bullet { param([string]$t)
    $escaped = $t -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
    return "<w:p><w:pPr><w:pStyle w:val=`"ListBullet`"/></w:pPr><w:r><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}
function subbullet { param([string]$t)
    $escaped = $t -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
    return "<w:p><w:pPr><w:numPr><w:ilvl w:val=`"1`"/><w:numId w:val=`"1`"/></w:numPr><w:spacing w:after=`"80`"/></w:pPr><w:r><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}
function emptyPara { return "<w:p><w:pPr><w:pStyle w:val=`"Normal`"/></w:pPr></w:p>" }
function pageBreak { return "<w:p><w:r><w:br w:type=`"page`"/></w:r></w:p>" }

function tblRow {
    param([string[]]$cells, [bool]$header = $false, [string[]]$widths)
    $rowXml = "<w:tr>"
    for ($i = 0; $i -lt $cells.Count; $i++) {
        $w = if ($widths -and $i -lt $widths.Count) { $widths[$i] } else { "1800" }
        $shading = if ($header) { "<w:shd w:val=`"clear`" w:color=`"auto`" w:fill=`"1F3864`"/>" } else { "" }
        $bold = if ($header) { "<w:b/><w:color w:val=`"FFFFFF`"/><w:sz w:val=`"18`"/>" } else { "<w:sz w:val=`"18`"/>" }
        $escaped = ($cells[$i]) -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
        $rowXml += "<w:tc><w:tcPr><w:tcW w:w=`"$w`" w:type=`"dxa`"/>$shading<w:tcMar><w:top w:w=`"80`" w:type=`"dxa`"/><w:left w:w=`"120`" w:type=`"dxa`"/><w:bottom w:w=`"80`" w:type=`"dxa`"/><w:right w:w=`"120`" w:type=`"dxa`"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr>$bold</w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p></w:tc>"
    }
    $rowXml += "</w:tr>"
    return $rowXml
}

function tblAltRow {
    param([string[]]$cells, [bool]$alt = $false, [string[]]$widths)
    $rowXml = "<w:tr>"
    $fill = if ($alt) { "E8EFF7" } else { "FFFFFF" }
    for ($i = 0; $i -lt $cells.Count; $i++) {
        $w = if ($widths -and $i -lt $widths.Count) { $widths[$i] } else { "1800" }
        $escaped = ($cells[$i]) -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;'
        $rowXml += "<w:tc><w:tcPr><w:tcW w:w=`"$w`" w:type=`"dxa`"/><w:shd w:val=`"clear`" w:color=`"auto`" w:fill=`"$fill`"/><w:tcMar><w:top w:w=`"80`" w:type=`"dxa`"/><w:left w:w=`"120`" w:type=`"dxa`"/><w:bottom w:w=`"80`" w:type=`"dxa`"/><w:right w:w=`"120`" w:type=`"dxa`"/></w:tcMar></w:tcPr><w:p><w:r><w:rPr><w:sz w:val=`"18`"/></w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p></w:tc>"
    }
    $rowXml += "</w:tr>"
    return $rowXml
}

function openTable { param([string]$totalWidth = "9360") return "<w:tbl><w:tblPr><w:tblW w:w=`"$totalWidth`" w:type=`"dxa`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"B0C4DE`"/><w:left w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"B0C4DE`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"B0C4DE`"/><w:right w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"B0C4DE`"/><w:insideH w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"B0C4DE`"/><w:insideV w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"B0C4DE`"/></w:tblBorders></w:tblPr>" }
function closeTable { return "</w:tbl>" }

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD DOCUMENT BODY
# ═══════════════════════════════════════════════════════════════════════════════
$body = [System.Text.StringBuilder]::new()

# ── COVER PAGE ─────────────────────────────────────────────────────────────────
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine("<w:p><w:pPr><w:jc w:val=`"center`"/><w:spacing w:before=`"720`" w:after=`"240`"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val=`"1F3864`"/><w:sz w:val=`"72`"/></w:rPr><w:t>EV MANUFACTURING</w:t></w:r></w:p>") | Out-Null
$body.AppendLine("<w:p><w:pPr><w:jc w:val=`"center`"/><w:spacing w:before=`"120`" w:after=`"120`"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val=`"2E75B6`"/><w:sz w:val=`"52`"/></w:rPr><w:t>Website Planning Document</w:t></w:r></w:p>") | Out-Null
$body.AppendLine("<w:p><w:pPr><w:jc w:val=`"center`"/><w:pBdr><w:bottom w:val=`"single`" w:sz=`"12`" w:space=`"1`" w:color=`"2E75B6`"/></w:pBdr><w:spacing w:before=`"240`" w:after=`"480`"/></w:pPr><w:r><w:rPr><w:color w:val=`"404040`"/><w:sz w:val=`"24`"/></w:rPr><w:t>Digital Strategy | User Experience | Growth Framework</w:t></w:r></w:p>") | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine("<w:p><w:pPr><w:jc w:val=`"center`"/></w:pPr><w:r><w:rPr><w:color w:val=`"606060`"/><w:sz w:val=`"24`"/></w:rPr><w:t>Prepared: May 2026</w:t></w:r></w:p>") | Out-Null
$body.AppendLine("<w:p><w:pPr><w:jc w:val=`"center`"/></w:pPr><w:r><w:rPr><w:color w:val=`"606060`"/><w:sz w:val=`"24`"/></w:rPr><w:t>Version 1.0 | Confidential</w:t></w:r></w:p>") | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ── TABLE OF CONTENTS ──────────────────────────────────────────────────────────
$body.AppendLine((h1 "Table of Contents")) | Out-Null
$toc = @(
    "1. Business Overview ................................................................ 3",
    "2. Target Audience .................................................................. 4",
    "3. User Personas ..................................................................... 5",
    "4. Competitor Analysis .............................................................. 7",
    "5. Website Goals ..................................................................... 8",
    "6. Customer Journey ................................................................. 9",
    "7. Key Website Features ........................................................... 10",
    "8. Sitemap ............................................................................ 11",
    "9. Content Structure .............................................................. 12",
    "10. SEO Strategy ................................................................... 14"
)
foreach ($line in $toc) {
    $escaped = $line -replace '&','&amp;'
    $body.AppendLine("<w:p><w:pPr><w:spacing w:after=`"120`"/></w:pPr><w:r><w:rPr><w:sz w:val=`"20`"/></w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>") | Out-Null
}
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1: BUSINESS OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "1. Business Overview")) | Out-Null
$body.AppendLine((para "This document outlines the complete website planning strategy for an Electric Vehicle (EV) manufacturing company targeting the Indian and global markets. The company positions itself as a technology-driven, sustainability-focused manufacturer delivering end-to-end electric mobility solutions across multiple vehicle segments.")) | Out-Null

$body.AppendLine((h2 "1.1 Vision Statement")) | Out-Null
$body.AppendLine((para "To accelerate the world's transition to sustainable electric mobility by delivering innovative, affordable, and high-performance EVs for every segment of society.")) | Out-Null

$body.AppendLine((h2 "1.2 Mission Statement")) | Out-Null
$body.AppendLine((para "To design, manufacture, and deliver world-class electric vehicles backed by an intelligent digital ecosystem, robust charging infrastructure, and a customer-first service experience that redefines ownership for the modern era.")) | Out-Null

$body.AppendLine((h2 "1.3 Product Lines")) | Out-Null
$body.AppendLine((h3 "2-Wheeler EVs (Electric Scooters and Motorcycles)")) | Out-Null
$body.AppendLine((bullet "Urban commuter scooters (0-80 km/h, 100-150 km range)")) | Out-Null
$body.AppendLine((bullet "Performance electric motorcycles (150+ km range, connected features)")) | Out-Null
$body.AppendLine((bullet "Last-mile delivery two-wheelers for B2B fleet operators")) | Out-Null
$body.AppendLine((h3 "4-Wheeler EVs (Passenger Vehicles)")) | Out-Null
$body.AppendLine((bullet "Compact electric hatchback for mass-market consumers")) | Out-Null
$body.AppendLine((bullet "Mid-size electric SUV targeting upper-mid segment")) | Out-Null
$body.AppendLine((bullet "Premium electric sedan with advanced ADAS and infotainment")) | Out-Null
$body.AppendLine((h3 "Commercial EVs")) | Out-Null
$body.AppendLine((bullet "Electric LCVs (Light Commercial Vehicles) for e-commerce and logistics")) | Out-Null
$body.AppendLine((bullet "Electric buses and minivans for public transport and school/corporate fleets")) | Out-Null
$body.AppendLine((bullet "3-wheeler electric cargo carriers for intra-city goods movement")) | Out-Null

$body.AppendLine((h2 "1.4 Manufacturing Capabilities")) | Out-Null
$body.AppendLine((bullet "State-of-the-art Gigafactory in India with 500,000 units/year capacity")) | Out-Null
$body.AppendLine((bullet "In-house battery cell manufacturing with LFP and NMC chemistry options")) | Out-Null
$body.AppendLine((bullet "Vertical integration covering motors, BMS, chargers, and software stacks")) | Out-Null
$body.AppendLine((bullet "ISO 9001:2015 certified quality management; IATF 16949 compliance")) | Out-Null
$body.AppendLine((bullet "R&D centers in India, Germany, and Singapore")) | Out-Null

$body.AppendLine((h2 "1.5 Unique Selling Propositions (USPs)")) | Out-Null
$body.AppendLine((bullet "Best-in-class range per charge at competitive price points")) | Out-Null
$body.AppendLine((bullet "OTA (Over-the-Air) software updates extending vehicle lifetime value")) | Out-Null
$body.AppendLine((bullet "Proprietary fast-charging network with 2,000+ stations across India")) | Out-Null
$body.AppendLine((bullet "Subscription-based battery replacement to lower upfront TCO")) | Out-Null
$body.AppendLine((bullet "Made-in-India with 80%+ domestic component sourcing")) | Out-Null
$body.AppendLine((bullet "AI-powered connected vehicle platform with predictive maintenance")) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2: TARGET AUDIENCE
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "2. Target Audience")) | Out-Null

$body.AppendLine((h2 "2.1 Primary Demographics")) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Segment","Age Range","Income (Annual)","Geography","Vehicle Type") $true @("1872","1872","1872","1872","1872"))) | Out-Null
$body.AppendLine((tblAltRow @("Urban Professionals","25-40","INR 8-25 LPA","Tier-1 Cities","2W / 4W Hatchback") $false @("1872","1872","1872","1872","1872"))) | Out-Null
$body.AppendLine((tblAltRow @("Young Tech Adopters","18-30","INR 3-10 LPA","Pan-India Urban","2W Scooter") $true @("1872","1872","1872","1872","1872"))) | Out-Null
$body.AppendLine((tblAltRow @("Fleet Operators","30-55","INR 25 LPA+","Metro + Tier-2","Commercial EV") $false @("1872","1872","1872","1872","1872"))) | Out-Null
$body.AppendLine((tblAltRow @("Eco-Conscious Families","30-50","INR 15-40 LPA","Tier-1/2 Cities","4W SUV / Sedan") $true @("1872","1872","1872","1872","1872"))) | Out-Null
$body.AppendLine((tblAltRow @("NRI / Diaspora","28-55","Varies (Global)","International","4W Premium") $false @("1872","1872","1872","1872","1872"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((h2 "2.2 Psychographic Profile")) | Out-Null
$body.AppendLine((bullet "Environmentally conscious; motivated by reducing carbon footprint")) | Out-Null
$body.AppendLine((bullet "Cost-aware; attracted by lower total cost of ownership (TCO) vs. ICE vehicles")) | Out-Null
$body.AppendLine((bullet "Tech-forward; expects connected features, app integration, and smart charging")) | Out-Null
$body.AppendLine((bullet "Brand-loyal once trust is established; influenced by peer reviews and social proof")) | Out-Null
$body.AppendLine((bullet "Research-intensive buyer; consults YouTube, Reddit, CarWale, and comparison portals")) | Out-Null

$body.AppendLine((h2 "2.3 Geographic Focus")) | Out-Null
$body.AppendLine((h3 "Primary Markets (India)")) | Out-Null
$body.AppendLine((bullet "Tier-1 Cities: Mumbai, Delhi-NCR, Bengaluru, Hyderabad, Chennai, Pune")) | Out-Null
$body.AppendLine((bullet "Tier-2 Cities: Jaipur, Lucknow, Indore, Nagpur, Surat, Coimbatore")) | Out-Null
$body.AppendLine((h3 "Secondary Markets (International)")) | Out-Null
$body.AppendLine((bullet "Southeast Asia: Vietnam, Indonesia, Thailand (2W and Commercial EVs)")) | Out-Null
$body.AppendLine((bullet "Middle East: UAE, Saudi Arabia (4W Premium)")) | Out-Null
$body.AppendLine((bullet "Africa: Kenya, Nigeria (affordable 2W and commercial)")) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3: USER PERSONAS
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "3. User Personas")) | Out-Null
$body.AppendLine((para "The following four personas represent the core buying archetypes for the EV website. Each persona guides content strategy, feature prioritisation, and UX design decisions.")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

# Persona 1
$body.AppendLine((h2 "Persona 1: Aditya Sharma — The Urban Daily Commuter")) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Attribute","Detail") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Age / Location","28 / Bengaluru, Karnataka") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Occupation","Software Engineer at a mid-size IT firm") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Income","INR 12 LPA") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Vehicle Interest","Electric scooter for daily 30 km office commute") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Tech Comfort","High - uses apps daily, comfortable with digital transactions") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Primary Goals","Save on fuel, reduce maintenance cost, eco-friendly choice") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Pain Points","Worried about charging at apartment, unclear about service centres") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Website Behaviour","Compares models, uses EMI calculator, watches video reviews") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Key CTA","Book Test Ride, Check EMI, Find Nearest Service Centre") $false @("3120","6240"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

# Persona 2
$body.AppendLine((h2 "Persona 2: Priya Nair — The Eco-Conscious Family Buyer")) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Attribute","Detail") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Age / Location","38 / Pune, Maharashtra") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Occupation","School Principal; dual-income family") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Income","Household INR 28 LPA") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Vehicle Interest","Electric SUV as primary family vehicle") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Tech Comfort","Moderate - uses smartphone but not an early adopter") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Primary Goals","Safety ratings, seating capacity, range for weekend highway trips") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Pain Points","Range anxiety on long drives, home charger installation complexity") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Website Behaviour","Reads safety content, uses range calculator, requests home charger info") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Key CTA","Schedule Test Drive, Download Brochure, Talk to an Expert") $false @("3120","6240"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

# Persona 3
$body.AppendLine((h2 "Persona 3: Ramesh Gupta — The Fleet Manager")) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Attribute","Detail") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Age / Location","45 / Delhi-NCR") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Occupation","Logistics Director at an e-commerce fulfillment company") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Vehicle Interest","50-200 electric LCVs for last-mile delivery fleet") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Tech Comfort","Moderate - uses fleet management dashboards") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Primary Goals","ROI analysis, payload capacity, uptime SLAs, fleet telematics") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Pain Points","Charging depot setup costs, driver training, OEM support responsiveness") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Website Behaviour","Downloads fleet ROI whitepapers, submits bulk enquiry forms") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Key CTA","Request Fleet Quotation, Download ROI Calculator, Contact B2B Team") $true @("3120","6240"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

# Persona 4
$body.AppendLine((h2 "Persona 4: Arjun Mehta — The EV Enthusiast")) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Attribute","Detail") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Age / Location","24 / Mumbai, Maharashtra") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Occupation","Content Creator / YouTuber specialising in EV reviews") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Vehicle Interest","Performance electric motorcycle; early adopter") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Tech Comfort","Very High - follows EV news, reads spec sheets, active in forums") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Primary Goals","Top-end specs, fast charging speed, customisation options") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Pain Points","Lack of detailed technical documentation, generic marketing content") $true @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Website Behaviour","Reads tech specs deeply, shares pages to social media, joins community") $false @("3120","6240"))) | Out-Null
$body.AppendLine((tblAltRow @("Key CTA","Configure Your Vehicle, Join EV Community, Pre-Order Now") $true @("3120","6240"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4: COMPETITOR ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "4. Competitor Analysis")) | Out-Null
$body.AppendLine((para "The following analysis benchmarks five leading EV manufacturers across key dimensions relevant to website strategy, digital presence, and market positioning.")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Company","Products","Price Range","Website UX","Digital Reach","Strengths","Weaknesses") $true @("1100","1300","1100","1300","1200","1280","1080"))) | Out-Null
$body.AppendLine((tblAltRow @("Ola Electric","S1, S1 Pro, S1 Air (2W)","INR 1-1.5L","Bold, app-first, dark theme","Very High (social-heavy)","Brand power, software updates","Service quality issues") $false @("1100","1300","1100","1300","1200","1280","1080"))) | Out-Null
$body.AppendLine((tblAltRow @("Ather Energy","450X, 450 Apex, Rizta","INR 1.2-2L","Clean, minimalist, tech-focused","High (community-driven)","Build quality, Ather Grid network","Pricing, limited city presence") $true @("1100","1300","1100","1300","1200","1280","1080"))) | Out-Null
$body.AppendLine((tblAltRow @("Tata Motors EV","Nexon EV, Punch EV, Curvv","INR 10-25L","Corporate, informative","Very High (dealer network)","Trust, service network depth","Slower OTA/software experience") $false @("1100","1300","1100","1300","1200","1280","1080"))) | Out-Null
$body.AppendLine((tblAltRow @("Rivian","R1T, R1S, EDV","USD 45-80K","Premium, immersive, adventure-led","High (USA-focused)","Brand storytelling, off-road niche","No India presence") $true @("1100","1300","1100","1300","1200","1280","1080"))) | Out-Null
$body.AppendLine((tblAltRow @("BYD","Atto 3, Seal, e6","INR 25-45L","Feature-rich, data-heavy","Moderate (India nascent)","Battery tech, value pricing","Perception challenges, limited recall handling") $false @("1100","1300","1100","1300","1200","1280","1080"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((h2 "4.1 Key Competitive Gaps to Exploit")) | Out-Null
$body.AppendLine((bullet "No competitor offers a unified multi-segment (2W + 4W + Commercial) website experience with cross-sell journeys")) | Out-Null
$body.AppendLine((bullet "Most websites lack a real-time charging network map with live availability status")) | Out-Null
$body.AppendLine((bullet "Fleet/B2B sections are underdeveloped across Indian EV brand sites")) | Out-Null
$body.AppendLine((bullet "Opportunity to lead with sustainability storytelling tied to lifecycle emissions data")) | Out-Null
$body.AppendLine((bullet "No strong community/advocacy ecosystem built into any competitor website")) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5: WEBSITE GOALS
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "5. Website Goals")) | Out-Null

$body.AppendLine((h2 "5.1 Primary Goals")) | Out-Null
$body.AppendLine((bullet "Generate qualified test drive / test ride bookings across all vehicle segments")) | Out-Null
$body.AppendLine((bullet "Drive direct-to-consumer vehicle enquiries and online bookings / reservations")) | Out-Null
$body.AppendLine((bullet "Establish brand authority as India's most trusted EV manufacturer")) | Out-Null
$body.AppendLine((bullet "Support dealer/partner network with lead routing and locator tools")) | Out-Null

$body.AppendLine((h2 "5.2 Secondary Goals")) | Out-Null
$body.AppendLine((bullet "Educate prospective buyers on EV ownership economics and charging infrastructure")) | Out-Null
$body.AppendLine((bullet "Build an engaged community of existing owners and EV advocates")) | Out-Null
$body.AppendLine((bullet "Support B2B fleet acquisition with dedicated discovery and quotation flows")) | Out-Null
$body.AppendLine((bullet "Serve as a self-service hub for existing owners (manuals, service booking, OTA status)")) | Out-Null
$body.AppendLine((bullet "Drive media, investor, and partnership enquiries")) | Out-Null

$body.AppendLine((h2 "5.3 Key Performance Indicators (KPIs)")) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("KPI","Target (Year 1)","Measurement Tool") $true @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("Monthly Unique Visitors","500,000+","Google Analytics 4") $false @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("Test Drive Bookings (Monthly)","5,000+","CRM / Website Form Submissions") $true @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("Online Vehicle Reservations","2,000+/month","Payment Gateway + CRM") $false @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("Lead Conversion Rate","4-6%","GA4 Funnel Reports") $true @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("Avg. Session Duration","3:30+ minutes","GA4") $false @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("Organic Search Traffic Share","55%+ of total","Google Search Console") $true @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("NPS Score (Post-Visit Survey)","60+","Hotjar / Qualtrics") $false @("3120","3120","3120"))) | Out-Null
$body.AppendLine((tblAltRow @("B2B Fleet Enquiries (Monthly)","200+","CRM Fleet Pipeline") $true @("3120","3120","3120"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6: CUSTOMER JOURNEY
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "6. Customer Journey")) | Out-Null
$body.AppendLine((para "The following maps the full purchase funnel from initial awareness through to post-purchase advocacy, identifying touchpoints, website roles, and content requirements at each stage.")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Stage","Customer Mindset","Website Touchpoints","Content Needed","Primary CTA") $true @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((tblAltRow @("1. Awareness","I am curious about EVs","Homepage, Blog, YouTube Embed","Hero video, EV myths debunked, cost savings calculator","Explore Models") $false @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((tblAltRow @("2. Consideration","Which EV is right for me?","Product Pages, Compare Tool, Range Calculator","Spec comparison, range heatmaps, ownership cost breakdowns","Compare Vehicles") $true @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((tblAltRow @("3. Intent","I want to experience this vehicle","Test Drive Booking, Dealer Locator, Configurator","Personalised configure flow, nearby dealer map, booking confirmation","Book Test Drive") $false @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((tblAltRow @("4. Purchase","I am ready to buy","Online Booking, EMI Calculator, Finance Partners","EMI options, government subsidy info, delivery timeline","Reserve Now") $true @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((tblAltRow @("5. Ownership","I need support and reassurance","Owner Portal, Service Booking, Charging Map","OTA updates, service history, charging station finder","Book Service") $false @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((tblAltRow @("6. Advocacy","I love my EV - I want to share","Community, Referral Programme, Social Share","Owner stories, referral rewards, community forums","Refer a Friend") $true @("1200","1600","2000","2560","2000"))) | Out-Null
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7: KEY WEBSITE FEATURES
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "7. Key Website Features")) | Out-Null

$body.AppendLine((h2 "7.1 EV Configurator")) | Out-Null
$body.AppendLine((bullet "Step-by-step visual configurator: choose model, colour, variant, accessories")) | Out-Null
$body.AppendLine((bullet "Real-time price update with GST, subsidy deductions, and delivery estimate")) | Out-Null
$body.AppendLine((bullet "360-degree exterior/interior view of configured vehicle")) | Out-Null
$body.AppendLine((bullet "Save configuration and share via WhatsApp/email")) | Out-Null

$body.AppendLine((h2 "7.2 Range Calculator")) | Out-Null
$body.AppendLine((bullet "Input: daily commute distance, driving style, city vs. highway, AC usage")) | Out-Null
$body.AppendLine((bullet "Output: estimated range, charging frequency per week, annual fuel savings")) | Out-Null
$body.AppendLine((bullet "Visual comparison against user's current petrol vehicle")) | Out-Null

$body.AppendLine((h2 "7.3 Dealer / Service Locator")) | Out-Null
$body.AppendLine((bullet "Google Maps integration with real-time dealer data")) | Out-Null
$body.AppendLine((bullet "Filters: nearest, open now, test drive available, service centre, fast charger")) | Out-Null
$body.AppendLine((bullet "Click-to-call and click-to-book appointment directly from map pin")) | Out-Null

$body.AppendLine((h2 "7.4 Test Drive Booking")) | Out-Null
$body.AppendLine((bullet "Multi-step booking form: vehicle, variant, preferred dealer, date/time slot")) | Out-Null
$body.AppendLine((bullet "Calendar integration with available slots from dealer CRM")) | Out-Null
$body.AppendLine((bullet "Automated SMS/WhatsApp/email confirmation and reminders")) | Out-Null
$body.AppendLine((bullet "Post-test-drive feedback survey to capture intent and objections")) | Out-Null

$body.AppendLine((h2 "7.5 EMI and Finance Calculator")) | Out-Null
$body.AppendLine((bullet "Inputs: vehicle price, down payment, loan tenure (12-84 months), interest rate")) | Out-Null
$body.AppendLine((bullet "FAME-II / state subsidy auto-deduction based on user's state")) | Out-Null
$body.AppendLine((bullet "Embedded partner finance applications (HDFC, SBI, Bajaj Finance)")) | Out-Null

$body.AppendLine((h2 "7.6 Vehicle Comparison Tool")) | Out-Null
$body.AppendLine((bullet "Side-by-side comparison of up to 3 models across 30+ parameters")) | Out-Null
$body.AppendLine((bullet "Smart recommendation engine: suggests best match based on user profile")) | Out-Null
$body.AppendLine((bullet "PDF export of comparison sheet for offline reference")) | Out-Null

$body.AppendLine((h2 "7.7 Charging Network Map")) | Out-Null
$body.AppendLine((bullet "Live interactive map of all proprietary charging stations with real-time slot availability")) | Out-Null
$body.AppendLine((bullet "Integration with third-party networks (Tata Power EZ Charge, ChargeZone, Statiq)")) | Out-Null
$body.AppendLine((bullet "Route planner: enter origin-destination, get charging stops en route")) | Out-Null
$body.AppendLine((bullet "Mobile-first design; deep-linked into owner app")) | Out-Null

$body.AppendLine((h2 "7.8 Owner Portal")) | Out-Null
$body.AppendLine((bullet "Vehicle health dashboard: battery status, service due, OTA update history")) | Out-Null
$body.AppendLine((bullet "Service booking with real-time slot availability at selected service centre")) | Out-Null
$body.AppendLine((bullet "Digital documents: RC, insurance, invoice accessible on demand")) | Out-Null
$body.AppendLine((bullet "Referral code management and rewards tracking")) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 8: SITEMAP
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "8. Sitemap")) | Out-Null
$body.AppendLine((para "Full hierarchical sitemap covering all primary navigation, sub-sections, and utility pages.")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Level 1","Level 2","Level 3","Notes") $true @("1800","2400","2760","2400"))) | Out-Null
$sitemap = @(
    @("Home","-","-","Hero, USPs, Model Highlights, News"),
    @("Vehicles","2-Wheelers","Scooter Model A","Specs, Gallery, Config, Book"),
    @("","","Scooter Model B",""),
    @("","","Electric Motorcycle",""),
    @("","4-Wheelers","Compact Hatchback",""),
    @("","","Electric SUV",""),
    @("","","Premium Sedan",""),
    @("","Commercial","Electric LCV","Fleet-specific CTA"),
    @("","","Electric Bus",""),
    @("","","Cargo 3-Wheeler",""),
    @("","Compare Vehicles","-","Multi-model comparison tool"),
    @("Technology","Battery Technology","-","Cell chemistry, BMS, warranty"),
    @("","Connected Platform","-","OTA, app integration, telematics"),
    @("","Safety","NCAP Results","ADAS features, crash test data"),
    @("","Charging","Fast Charge Tech","Charge speeds, cable types"),
    @("Charging Network","Map","-","Live availability map"),
    @("","Route Planner","-","A-to-B charge planning"),
    @("","Home Charging","-","AC charger installation guide"),
    @("","Partner Stations","-","Third-party network integrations"),
    @("Sustainability","Green Manufacturing","-","Factory emissions, solar usage"),
    @("","Lifecycle Impact","-","Lifecycle carbon analysis"),
    @("","ESG Report","-","Annual sustainability report"),
    @("Buy / Book","Configure","-","Vehicle configurator"),
    @("","Book Test Drive","-","Booking form + calendar"),
    @("","Finance","EMI Calculator","Finance partner applications"),
    @("","Subsidies","-","FAME-II, state subsidy guide"),
    @("","Reserve Online","-","Booking token + delivery ETA"),
    @("Fleet / B2B","Fleet Overview","-","ROI calculator, fleet features"),
    @("","Request Quotation","-","B2B lead capture form"),
    @("","Case Studies","-","Logistics partner success stories"),
    @("Dealers","Dealer Locator","-","Map + filters"),
    @("","Become a Dealer","-","Dealership application form"),
    @("Owners","Owner Portal","-","Login-gated dashboard"),
    @("","Service Booking","-","Slot booking form"),
    @("","Manuals & Downloads","-","PDFs by model"),
    @("","Community","-","Forum, owner groups"),
    @("","Referral Programme","-","Code sharing, rewards"),
    @("About Us","Company Story","-","Vision, milestones"),
    @("","Leadership Team","-","Executive profiles"),
    @("","Newsroom","Press Releases","Media kit, PR contacts"),
    @("","Careers","-","Job listings, culture"),
    @("","Investors","-","Reports, IR contact"),
    @("","Contact Us","-","Regional offices, chat widget")
)
$alt = $false
foreach ($row in $sitemap) {
    $body.AppendLine((tblAltRow $row $alt @("1800","2400","2760","2400"))) | Out-Null
    $alt = !$alt
}
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 9: CONTENT STRUCTURE
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "9. Content Structure")) | Out-Null

$body.AppendLine((h2 "9.1 Homepage")) | Out-Null
$body.AppendLine((bullet "Hero Section: Full-viewport video/animation showcasing vehicle range in motion; headline focus on range + savings; dual CTA (Explore Models / Book Test Drive)")) | Out-Null
$body.AppendLine((bullet "USP Strip: 5 icon-driven tiles — Longest Range | Fastest Charge | 8-Year Battery Warranty | 2,000+ Charging Stations | Made in India")) | Out-Null
$body.AppendLine((bullet "Vehicle Showcase Carousel: Swipeable cards for each model with price, range, and quick-configure link")) | Out-Null
$body.AppendLine((bullet "Range Calculator Widget: Embedded interactive tool above the fold on homepage")) | Out-Null
$body.AppendLine((bullet "Social Proof Section: Owner testimonials, review scores, media logos")) | Out-Null
$body.AppendLine((bullet "Sustainability Banner: Animated counter showing CO2 saved to date by all vehicles on road")) | Out-Null
$body.AppendLine((bullet "News & Community Feed: Latest press releases + community highlights")) | Out-Null

$body.AppendLine((h2 "9.2 Product Pages (Per Vehicle Model)")) | Out-Null
$body.AppendLine((bullet "Hero: Studio-quality vehicle imagery with colour selector; animated range badge")) | Out-Null
$body.AppendLine((bullet "Key Stats Bar: Range / Top Speed / Charge Time / Seating (sticky on scroll)")) | Out-Null
$body.AppendLine((bullet "Deep Dive Sections: Design, Performance, Technology, Safety, Charging, Ownership")) | Out-Null
$body.AppendLine((bullet "360-Degree Interior/Exterior Viewer")) | Out-Null
$body.AppendLine((bullet "Variant / Colour Configurator with real-time price display")) | Out-Null
$body.AppendLine((bullet "Compare: Side-by-side with two other models in the same segment")) | Out-Null
$body.AppendLine((bullet "Sticky Purchase Bar: Price + Reserve Now + EMI from per month")) | Out-Null
$body.AppendLine((bullet "FAQ accordion: Warranty, servicing, charging questions")) | Out-Null

$body.AppendLine((h2 "9.3 Technology Page")) | Out-Null
$body.AppendLine((bullet "Battery Technology: Infographic explaining cell chemistry, BMS, thermal management")) | Out-Null
$body.AppendLine((bullet "Charging Architecture: AC vs. DC, charge curve graph, home charger guide")) | Out-Null
$body.AppendLine((bullet "Connected Vehicle Platform: App features, OTA update process, data privacy")) | Out-Null
$body.AppendLine((bullet "Safety Systems: ADAS features list, crash test results, structural design highlights")) | Out-Null

$body.AppendLine((h2 "9.4 Sustainability Page")) | Out-Null
$body.AppendLine((bullet "Environmental Impact Calculator: Personalised CO2 saving vs. petrol equivalent")) | Out-Null
$body.AppendLine((bullet "Manufacturing: Solar-powered factory, water recycling, zero-landfill commitment")) | Out-Null
$body.AppendLine((bullet "Battery Second Life Programme: Repurposing EV batteries as grid storage")) | Out-Null
$body.AppendLine((bullet "ESG goals dashboard with progress trackers (2030 targets)")) | Out-Null

$body.AppendLine((h2 "9.5 Fleet / B2B Section")) | Out-Null
$body.AppendLine((bullet "Fleet Overview with logistics use-case scenarios (e-commerce, school, corporate)")) | Out-Null
$body.AppendLine((bullet "TCO Calculator: Compares fleet EV cost vs. diesel over 5 years")) | Out-Null
$body.AppendLine((bullet "Case Study Hub: Downloadable PDFs with real deployment metrics")) | Out-Null
$body.AppendLine((bullet "Dedicated B2B Lead Form with routing to regional fleet sales teams")) | Out-Null

$body.AppendLine((h2 "9.6 Support / Owner Portal")) | Out-Null
$body.AppendLine((bullet "FAQ by category: Charging, Warranty, Service, Financing, Software")) | Out-Null
$body.AppendLine((bullet "Video Help Centre: How-to library covering key ownership scenarios")) | Out-Null
$body.AppendLine((bullet "Service Booking: Real-time slot availability + pick-up/drop option")) | Out-Null
$body.AppendLine((bullet "Live Chat + WhatsApp Support integration")) | Out-Null

$body.AppendLine((h2 "9.7 About Us")) | Out-Null
$body.AppendLine((bullet "Company Timeline: Interactive milestone scroll (founding to present)")) | Out-Null
$body.AppendLine((bullet "Leadership: Headshots, bios, LinkedIn links for C-suite and board")) | Out-Null
$body.AppendLine((bullet "Newsroom: Filterable press releases, media coverage, awards")) | Out-Null
$body.AppendLine((bullet "Careers: Job listings with culture video, benefits, employee testimonials")) | Out-Null
$body.AppendLine((pageBreak)) | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 10: SEO STRATEGY
# ══════════════════════════════════════════════════════════════════════════════
$body.AppendLine((h1 "10. SEO Strategy")) | Out-Null

$body.AppendLine((h2 "10.1 Keyword Clusters")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine((openTable "9360")) | Out-Null
$body.AppendLine((tblRow @("Cluster","Primary Keywords","Supporting Keywords","Search Intent","Target Page") $true @("1300","2200","2000","1500","2360"))) | Out-Null
$keywords = @(
    @("2W EV","best electric scooter India, electric scooter price","electric scooter range, EV scooter comparison","Commercial","2W Product Pages"),
    @("4W EV","electric car India, best electric SUV India","electric car price 2026, EV SUV range","Commercial","4W Product Pages"),
    @("EV Charging","EV charging station near me, home EV charger","how to charge electric car India","Navigational","Charging Network Page"),
    @("EV Economics","electric car running cost India, EV vs petrol","EMI calculator electric car, EV savings calculator","Informational","Finance + Blog"),
    @("Fleet EV","electric fleet vehicles India, EV for logistics","commercial EV ROI, electric LCV India","Commercial","Fleet / B2B Section"),
    @("EV Brand","[Brand] review, [Brand] service centre","[Brand] vs Ather vs Ola","Navigational","Homepage + About"),
    @("Sustainability","green vehicles India, zero emission cars","carbon footprint electric vehicle","Informational","Sustainability Page"),
    @("Test Drive","book EV test drive near me","electric scooter test ride [city]","Transactional","Test Drive Booking Page")
)
$alt = $false
foreach ($row in $keywords) {
    $body.AppendLine((tblAltRow $row $alt @("1300","2200","2000","1500","2360"))) | Out-Null
    $alt = !$alt
}
$body.AppendLine((closeTable)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((h2 "10.2 On-Page SEO Guidelines")) | Out-Null
$body.AppendLine((bullet "Each product page targets a unique primary keyword in the H1, title tag, and meta description")) | Out-Null
$body.AppendLine((bullet "Title tag format: [Model Name] | Range | Price | [Brand] — Electric Vehicles India")) | Out-Null
$body.AppendLine((bullet "Structured data (JSON-LD): Product schema on vehicle pages; FAQPage schema on support pages; LocalBusiness schema for each dealer")) | Out-Null
$body.AppendLine((bullet "Alt text on all images; descriptive file names (model-name-ev-front-view.jpg)")) | Out-Null
$body.AppendLine((bullet "Internal linking: Every product page cross-links to the comparison tool, test drive booking, and related blog posts")) | Out-Null
$body.AppendLine((bullet "Breadcrumb navigation with BreadcrumbList schema markup")) | Out-Null

$body.AppendLine((h2 "10.3 Technical SEO")) | Out-Null
$body.AppendLine((bullet "Core Web Vitals targets: LCP under 2.5s, CLS under 0.1, INP under 200ms")) | Out-Null
$body.AppendLine((bullet "Mobile-first indexing: all pages designed and tested on mobile before desktop")) | Out-Null
$body.AppendLine((bullet "Canonical tags on all paginated content and filtered URLs (dealer locator filters)")) | Out-Null
$body.AppendLine((bullet "XML sitemap auto-generated and submitted to Google Search Console and Bing Webmaster Tools")) | Out-Null
$body.AppendLine((bullet "hreflang tags for international pages (English-India, English-UAE, Vietnamese)")) | Out-Null
$body.AppendLine((bullet "HTTPS enforced across all subdomains; HSTS header enabled")) | Out-Null
$body.AppendLine((bullet "Lazy loading for images and videos; next-gen WebP/AVIF image formats")) | Out-Null
$body.AppendLine((bullet "Server-side rendering (SSR) or static generation for product pages to ensure crawlability")) | Out-Null

$body.AppendLine((h2 "10.4 Content Marketing Plan")) | Out-Null
$body.AppendLine((h3 "Blog / Resource Hub (2 posts/week)")) | Out-Null
$body.AppendLine((bullet "EV Buying Guides: Top 5 Electric Scooters Under INR 1.5 Lakh (2026)")) | Out-Null
$body.AppendLine((bullet "Ownership How-Tos: How to Install a Home EV Charger in a Mumbai Apartment")) | Out-Null
$body.AppendLine((bullet "Industry Analysis: FAME-III Policy Impact on EV Prices in India")) | Out-Null
$body.AppendLine((bullet "Comparison Posts: [Brand] SUV vs. Tata Nexon EV vs. MG ZS EV — Full Breakdown")) | Out-Null
$body.AppendLine((h3 "Video Content (YouTube + Embedded)")) | Out-Null
$body.AppendLine((bullet "Model launch films and product deep-dives (optimised with transcript for SEO)")) | Out-Null
$body.AppendLine((bullet "Owner testimonial series: Real owners, real cities, real routes")) | Out-Null
$body.AppendLine((bullet "Factory tour and manufacturing transparency content")) | Out-Null

$body.AppendLine((h2 "10.5 Local SEO for Dealerships")) | Out-Null
$body.AppendLine((bullet "Individual Google Business Profile for every dealer and service centre")) | Out-Null
$body.AppendLine((bullet "Dedicated landing page per city/dealer with unique NAP (Name, Address, Phone)")) | Out-Null
$body.AppendLine((bullet "URL structure: /dealers/[city]/[dealer-name] for maximum local ranking potential")) | Out-Null
$body.AppendLine((bullet "Automated review request workflow post-service visit via SMS/WhatsApp")) | Out-Null
$body.AppendLine((bullet "LocalBusiness schema on each dealer page; aggregated rating display")) | Out-Null
$body.AppendLine((bullet "City-level landing pages targeting [city] + electric vehicle/scooter queries")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null

$body.AppendLine((h2 "10.6 Link Building Strategy")) | Out-Null
$body.AppendLine((bullet "EV Media Partnerships: Editorial relationships with EVStory, ElectricVehicleWeb, AutocarIndia")) | Out-Null
$body.AppendLine((bullet "Government / Industry Listings: NITI Aayog EV portals, SIAM, SMEV directories")) | Out-Null
$body.AppendLine((bullet "Guest Posts: Expert articles on sustainable mobility for leading news portals")) | Out-Null
$body.AppendLine((bullet "PR-driven links: New model launches, award wins, funding announcements targeted at DA 50+ publications")) | Out-Null
$body.AppendLine((bullet "Community-earned links: Active presence in EV forums, Reddit India EV, TeamBHP, CarWale forums")) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine((emptyPara)) | Out-Null
$body.AppendLine("<w:p><w:pPr><w:jc w:val=`"center`"/><w:pBdr><w:top w:val=`"single`" w:sz=`"6`" w:space=`"1`" w:color=`"2E75B6`"/></w:pBdr><w:spacing w:before=`"480`" w:after=`"120`"/></w:pPr><w:r><w:rPr><w:color w:val=`"808080`"/><w:sz w:val=`"18`"/></w:rPr><w:t>EV Manufacturing | Website Planning Document | Version 1.0 | May 2026 | Confidential</w:t></w:r></w:p>") | Out-Null

# ═══════════════════════════════════════════════════════════════════════════════
# ASSEMBLE document.xml
# ═══════════════════════════════════════════════════════════════════════════════
$docXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>
    $($body.ToString())
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId99"/>
      <w:footerReference w:type="default" r:id="rId98"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$docXml | Set-Content "$tmpDir\word\document.xml" -Encoding UTF8

# ═══════════════════════════════════════════════════════════════════════════════
# ZIP everything into .docx
# ═══════════════════════════════════════════════════════════════════════════════
[System.IO.Compression.ZipFile]::CreateFromDirectory($tmpDir, $outputPath)

# Cleanup
Remove-Item $tmpDir -Recurse -Force

if (Test-Path $outputPath) {
    $size = [math]::Round((Get-Item $outputPath).Length / 1KB, 1)
    Write-Host "SUCCESS: $outputPath ($size KB)"
} else {
    Write-Host "ERROR: File not created"
}
