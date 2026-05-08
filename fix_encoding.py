import re, os

files = [
    r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\login\page.tsx',
    r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\onboarding\page.tsx',
    r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\dashboard\DashboardClient.tsx',
    r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\dashboard\plan\page.tsx',
    r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\dashboard\progress\page.tsx',
    r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\dashboard\strength\page.tsx',
]

def fix(m):
    code = int(m.group(1), 16)
    # Skip surrogates (emoji pairs like \uD83C\uDFC3) — keep as-is in source
    if 0xD800 <= code <= 0xDFFF:
        return m.group(0)
    return chr(code)

for f in files:
    # Read as bytes
    with open(f, 'rb') as fh:
        raw = fh.read()
    
    # Strip BOM if present
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
    
    content = raw.decode('utf-8', errors='replace')
    
    # Replace literal \uXXXX sequences (6 chars: backslash, u, 4 hex digits)
    fixed = re.sub(r'\\u([0-9a-fA-F]{4})', fix, content)
    
    if fixed != content:
        # Write back as UTF-8 without BOM
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(fixed)
        print('Fixed:', os.path.basename(f))
    else:
        print('No change:', os.path.basename(f))

print('Done.')
