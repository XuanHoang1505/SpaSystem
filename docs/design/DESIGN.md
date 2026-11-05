---
name: Spa Như Nguyệt
colors:
  background: '#faf7f2'
  foreground: '#342e30'
  card: '#fffdf9'
  primary: '#92596b'
  on-primary: '#ffffff'
  secondary: '#dde6da'
  on-secondary: '#2f3d31'
  muted: '#f1ebe5'
  muted-foreground: '#72666a'
  accent: '#f5e8eb'
  on-accent: '#6e3f50'
  destructive: '#a23846'
  border: '#e5dadb'
  input: '#ddd0d2'
  ring: '#92596b'
  status-success: '#e3efe5'
  on-status-success: '#386647'
  status-warning: '#f7ecd9'
  on-status-warning: '#835c22'
  status-info: '#e2ebf3'
  on-status-info: '#2f5677'
  status-danger: '#f8e3e5'
  on-status-danger: '#a23846'
  status-neutral: '#efebe8'
  on-status-neutral: '#5f5559'
  chart-1: '#92596b'
  chart-2: '#6f8f77'
  chart-3: '#c39a5b'
  chart-4: '#5f7d99'
  chart-5: '#c48a9b'
  dark-background: '#1a1517'
  dark-card: '#231d1f'
  dark-foreground: '#f2ebe7'
  dark-primary: '#d49aab'
  dark-border: '#3a3033'
typography:
  display:
    fontFamily: Lora
    fontSize: 60px
    fontWeight: '500'
    lineHeight: 1.1
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Lora
    fontSize: 30px
    fontWeight: '500'
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Lora
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 1.25
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 1.6
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 1.5
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: 0.2em
  mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
rounded:
  sm: 8px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  page-gutter-mobile: 16px
  page-gutter-desktop: 32px
  section: 64px
  card-padding: 24px
---

<!--
Nguồn thiết kế cho Google Stitch (MCP `stitch`), chép từ apps/web/src/styles/theme.css (ADR-0005).
Code là nguồn chuẩn: đổi token ở theme.css trước, rồi cập nhật file này và design system trên Stitch.
Viết bằng tiếng Anh vì Stitch đọc file này; văn bản trên màn hình vẫn là tiếng Việt.
-->

## Brand & Style

Spa Như Nguyệt is a calm Vietnamese skincare and relaxation spa. The interface feels quiet, warm and trustworthy: cream backgrounds, a muted plum accent, soft sage and generous whitespace. It is a product UI built with **shadcn/ui on Tailwind CSS**, so screens should look like well-composed shadcn layouts, not marketing templates.

- All on-screen text is **Vietnamese with full diacritics** (e.g. "Đặt lịch hẹn", "Dịch vụ", "Thanh toán").
- Money: `1.500.000 ₫`. Dates `dd/MM/yyyy`, times 24-hour `HH:mm`.
- No gradients, glassmorphism or heavy imagery. Decorative shapes, when used, are flat circles/arches in accent, sage and chart-5 tints.

## Colors

- **Primary plum `#92596b`**: main CTAs, active nav item, links, focus ring. White text on it.
- **Background `#faf7f2`** (page) and **card `#fffdf9`** (cards, dialogs, sheets, sidebar).
- **Foreground `#342e30`**, **muted-foreground `#72666a`** for secondary text.
- **Accent `#f5e8eb`** with `#6e3f50` text: hover backgrounds, selected menu items, icon bubbles.
- **Secondary sage `#dde6da`**: secondary buttons and neutral badges.
- **Border `#e5dadb`**: 1px hairlines on cards, tables, inputs.
- **Status badges** are soft pills: success, warning, info, danger, neutral, each a light background with a darker text of the same hue (see front matter). Never invent other badge colors.
- Dark mode exists (background `#1a1517`, card `#231d1f`, primary `#d49aab`) **only in the staff and owner workspaces**, switched by a theme toggle in their top bar. Public pages and the customer workspace are always light, with no theme toggle. Design in light mode unless asked.

## Typography

- **Headings (h1–h3): Lora** serif, weight 500, tight tracking. Page titles 30px, hero up to 60px with an italic plum phrase.
- **Body and controls: DM Sans**, 16px body, 14px in tables and forms.
- **Eyebrow labels**: 12px DM Sans, semibold, uppercase, 0.2em tracking, primary color, above section titles.
- **Numbers/codes** (order codes, counters): JetBrains Mono.

## Layout

- **Public pages**: sticky top header (brand mark "N" in a plum circle + "Như Nguyệt / SPA & CHĂM SÓC DA", nav links, "Đăng ký" link and "Đăng nhập" button; **no theme toggle**, public pages are always light), content max-width 1280px, simple footer.
- **Auth pages** (login, register, forgot password): no site header or footer. One rounded split card: left (from `lg`) a muted intro panel with the brand, a Lora title with an italic plum phrase and three real features (online booking, treatment progress, buy packages and pay online) over flat accent/sage circles; right the brand (below `lg`), a "Về trang chủ" link and the form. No medical claims, no social login, no "remember me".
- **Customer / staff / owner areas**: shadcn **Sidebar** on the left (collapsible to icons; brand at top, grouped nav with lucide icons, footer note), a 64px top bar with sidebar trigger and the workspace name, then the page. Every page starts with a **page header**: eyebrow, Lora title, short description, actions on the right.
- Mobile first: works at 320px; sidebar becomes a drawer; tables scroll inside their card, never the page.

## Components (shadcn vocabulary)

- **Button**: radius 10px, height 36px (40px large). Variants: default (plum), outline, secondary (sage), ghost, destructive, link. Loading = spinner + same label.
- **Input / Select / Textarea**: 36px, 1px input border, card background, plum focus ring. Label above, hint and error text below (error in destructive).
- **Card**: card background, 1px border, radius 16px, very soft shadow, 24px padding.
- **Data table**: inside a bordered card; header row on a muted tint with muted text; sortable headers show an up/down arrow; rows have a hover tint; last column is a "⋯" actions menu; footer shows "Hiển thị 1–10 trong 57", "Số dòng" selector, "Trang 1/6" and prev/next icon buttons. Loading shows skeleton rows; empty and error states are centered inside the table with an icon bubble, a title, a sentence and an action.
- **Status badge**: rounded-full pill with a small dot, using the status colors.
- **Dialog** for short create/edit forms, **Sheet** (right side) for record details, **AlertDialog** for cancel/delete confirmations, **toast** top-right for results.
- Icons: lucide, 16px in controls, outline style.
