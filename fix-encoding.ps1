$enc = [System.Text.UTF8Encoding]::new($false)
$root = "C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app"
$files = @(
  "$root\page.tsx",
  "$root\onboarding\page.tsx",
  "$root\dashboard\DashboardClient.tsx",
  "$root\dashboard\coach\page.tsx",
  "$root\layout.tsx"
)

foreach ($file in $files) {
  if (-not (Test-Path $file)) { Write-Host "SKIP: $file"; continue }
  $c = [System.IO.File]::ReadAllText($file, $enc)
  $orig = $c

  # Norwegian letters
  $c = $c.Replace("Ã¥", "å")
  $c = $c.Replace("Ã¸", "ø")
  $c = $c.Replace("Ã¦", "æ")
  $c = $c.Replace("Ã˜", "Ø")
  $c = $c.Replace("Ã†", "Æ")
  $c = $c.Replace("Ã…", "Å")
  $c = $c.Replace("Ã©", "é")
  $c = $c.Replace("Ã³", "ó")

  # Em dash and punctuation
  $c = $c.Replace("â€"", "—")
  $c = $c.Replace("â€™", "'")
  $c = $c.Replace("â€œ", [char]0x201C)
  $c = $c.Replace("â€", [char]0x201D)
  $c = $c.Replace("â€¦", "…")
  $c = $c.Replace("â†'", "→")

  # Guillemets
  $c = $c.Replace("Â«", "«")
  $c = $c.Replace("Â»", "»")
  $c = $c.Replace("Â·", "·")

  if ($c -ne $orig) {
    [System.IO.File]::WriteAllText($file, $c, $enc)
    Write-Host "FIXED: $(Split-Path $file -Leaf)"
  } else {
    Write-Host "CLEAN: $(Split-Path $file -Leaf)"
  }
}

Write-Host "Done."
