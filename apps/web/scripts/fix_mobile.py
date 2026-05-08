fp = r'C:\Users\AD10209\01. WMIO - Kevin Ha\21. VSCode og Claude\apps\RunAI\apps\web\src\app\dashboard\DashboardClient.tsx'
raw = open(fp, 'rb').read().decode('utf-8')

# Normalize line endings
fixed = raw.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

# 1. Add extra imports
fixed = fixed.replace(
    'import {\n  Brain,\n  MessageCircle,\n  ChevronRight,\n  Play,\n} from "lucide-react";',
    'import {\n  Brain,\n  MessageCircle,\n  ChevronRight,\n  Play,\n  Activity,\n  Calendar,\n  TrendingUp,\n  Zap,\n} from "lucide-react";'
)

# 2. Fix main div + add mobile top bar
fixed = fixed.replace(
    '<div className="flex-1 ml-60 p-8">\n      {/* Top bar */}\n      <div className="flex items-center justify-between mb-8">',
    '<div className="flex-1 md:ml-60 p-4 md:p-8 pb-24 md:pb-8">\n'
    '      {/* Mobile top bar */}\n'
    '      <div className="flex md:hidden items-center justify-between mb-5">\n'
    '        <div className="flex items-center gap-2">\n'
    '          <div className="w-7 h-7 bg-[#FC5200] rounded-lg flex items-center justify-center">\n'
    '            <span className="text-white font-black text-xs">R</span>\n'
    '          </div>\n'
    '          <span className="font-bold text-[#111110]">RunAI</span>\n'
    '        </div>\n'
    '        <Link href="/dashboard/coach" className="flex items-center gap-2 bg-white border border-[#E5E5E2] px-3 py-2 rounded-xl text-sm">\n'
    '          <MessageCircle size={14} className="text-[#FC5200]" />\n'
    '          Trener\n'
    '        </Link>\n'
    '      </div>\n\n'
    '      {/* Top bar */}\n'
    '      <div className="hidden md:flex items-center justify-between mb-8">'
)

# 3. Fix metrics grid
fixed = fixed.replace(
    '<div className="grid grid-cols-4 gap-4 mb-6">',
    '<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">'
)

# 4. Fix main content grid
fixed = fixed.replace(
    '<div className="grid grid-cols-3 gap-6">',
    '<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">'
)

# 5. Fix col-span-2
fixed = fixed.replace(
    '<div className="col-span-2 space-y-6">',
    '<div className="md:col-span-2 space-y-4 md:space-y-6">'
)

# 6. Add mobile bottom nav before closing tag
mobile_nav = (
    '\n      {/* Mobile bottom nav */}\n'
    '      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E2] flex z-40">\n'
    '        {[\n'
    '          { icon: Activity, label: "Oversikt", href: "/dashboard" },\n'
    '          { icon: Calendar, label: "Plan", href: "/dashboard/plan" },\n'
    '          { icon: Brain, label: "Trener", href: "/dashboard/coach" },\n'
    '          { icon: TrendingUp, label: "Fremgang", href: "/dashboard/progress" },\n'
    '          { icon: Zap, label: "Styrke", href: "/dashboard/strength" },\n'
    '        ].map(({ icon: Icon, label, href }) => (\n'
    '          <Link\n'
    '            key={href}\n'
    '            href={href}\n'
    '            className="flex-1 flex flex-col items-center gap-1 py-3 text-[#6B6B65] hover:text-[#FC5200] transition-colors"\n'
    '          >\n'
    '            <Icon size={18} />\n'
    '            <span className="text-[9px] font-medium">{label}</span>\n'
    '          </Link>\n'
    '        ))}\n'
    '      </nav>'
)

fixed = fixed.replace(
    '\n    </div>\n  );\n}\n\n\n\nfunction StravaIcon() {',
    mobile_nav + '\n    </div>\n  );\n}\n\n\n\nfunction StravaIcon() {'
)

open(fp, 'w', encoding='utf-8', newline='\n').write(fixed)
print('Done. Lines now:', fixed.count('\n'))
