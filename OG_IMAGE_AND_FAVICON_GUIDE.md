# Open Graph Image & Favicon Guide

## ✅ What's Already Done

I've configured all the Open Graph metadata in `src/app/layout.tsx`:
- Facebook/LinkedIn/Slack previews
- Twitter cards
- Proper favicon configuration
- Web manifest for PWA support
- SEO metadata

## 🎨 OG Image Design Suggestion

Create a **1200 x 630px** PNG image with this design:

### Layout:
```
┌────────────────────────────────────────────────┐
│                                                │
│  Background: Soft gradient (#F5F5F0 → white)  │
│                                                │
│         [Luma Logo - larger version]           │
│                                                │
│     Medical Necessity Documentation            │
│         Made Simple                            │
│                                                │
│  ✓ HIPAA Compliant  ✓ Audit-Proof            │
│  ✓ Save Hours       ✓ Prevent Clawbacks      │
│                                                │
│          Trusted by Healthcare Providers       │
│                                                │
└────────────────────────────────────────────────┘
```

### Design Specs:
- **Background**: Soft gradient from `#F5F5F0` (sage light) to white
- **Logo**: Your existing dot pattern logo (enlarged, centered top)
- **Main headline**: "Medical Necessity Documentation Made Simple"
  - Font: DM Serif Display, 72px, `#2D3B45` (dark-bg)
- **Subtext benefits**: 4 checkmarks with benefits
  - Font: IBM Plex Sans, 28px, `#5A6B63`
  - Checkmarks: `#ABC5B6` (mint)
- **Footer**: "Trusted by Healthcare Providers"
  - Font: IBM Plex Sans, 24px, `#8A9B93`

### Design Tool Options:
1. **Figma** (recommended)
2. **Canva** (use custom dimensions: 1200x630px)
3. **Adobe Illustrator**

### Quick Canva Template:
1. Go to Canva → Custom size: 1200 x 630 px
2. Add gradient background
3. Upload your logo (the dot pattern from `icon.svg`)
4. Add text with hierarchy above
5. Export as PNG

## 📁 Where to Place Files

Once you create the images, place them here:

```
/Users/edward/Desktop/luma 2/public/
├── og-image.png          ← 1200x630px OG image
├── favicon.ico           ← 32x32px ICO file
├── icon-192.png          ← 192x192px PNG
├── icon-512.png          ← 512x512px PNG
├── apple-icon.png        ← 180x180px PNG
└── manifest.json         ← Already created ✅
```

## 🔧 Creating Favicons from Your Logo

### Option 1: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload your `icon.svg` from `src/app/icon.svg`
3. Generate all sizes
4. Download and place in `/public/`

### Option 2: ImageMagick (Command Line)
```bash
# From your icon.svg, create all sizes
convert icon.svg -resize 192x192 public/icon-192.png
convert icon.svg -resize 512x512 public/icon-512.png
convert icon.svg -resize 180x180 public/apple-icon.png
convert icon.svg -resize 32x32 public/favicon.ico
```

### Option 3: Figma/Design Tool
Export your existing logo at these exact sizes:
- `favicon.ico` - 32x32px (ICO format)
- `icon-192.png` - 192x192px
- `icon-512.png` - 512x512px
- `apple-icon.png` - 180x180px (for iOS home screen)

## 🎯 What Each File Is For

| File | Size | Purpose |
|------|------|---------|
| `og-image.png` | 1200x630 | Facebook, LinkedIn, Slack, Discord previews |
| `favicon.ico` | 32x32 | Browser tab icon (legacy) |
| `icon.svg` | Vector | Modern browser tab icon (already exists ✅) |
| `icon-192.png` | 192x192 | PWA icon, Android home screen |
| `icon-512.png` | 512x512 | PWA icon, Android splash |
| `apple-icon.png` | 180x180 | iOS home screen when saved |

## ✅ Testing Your OG Image

After placing `og-image.png` in `/public/`:

1. **Deploy to production** (Vercel will pick it up)

2. **Test with these tools:**
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/
   - Generic: https://www.opengraph.xyz/

3. **Clear cache if needed:**
   - Add `?v=2` to your URL when testing
   - These platforms cache aggressively

## 🚀 Priority Action Items

### Immediate (Must Do):
1. **Create `og-image.png`** using the design specs above
2. **Generate favicons** from your existing `icon.svg`
3. **Place all files in `/public/`**
4. **Deploy to production**

### Optional (Nice to Have):
- Create variants for different pages (e.g., dashboard OG image)
- Add animation to OG image (some tools support GIF)
- Create seasonal variants

## 📊 Current Status

✅ Metadata configured
✅ Web manifest created
✅ SVG icon exists (`src/app/icon.svg`)
⏳ Need OG image (1200x630px)
⏳ Need PNG favicons (multiple sizes)

## 💡 Pro Tips

1. **OG Image Best Practices:**
   - Keep text readable at small sizes
   - Avoid putting critical info near edges (safe zone: 1200x600)
   - Test on mobile (preview gets cropped)
   - Use high contrast
   - Keep file size under 1MB

2. **Favicon Best Practices:**
   - Simple design works best at small sizes
   - Your dot pattern is perfect for this
   - Use transparent background for PNG files
   - ICO format for maximum compatibility

3. **Testing:**
   - Always test on actual platforms (not just validators)
   - Check both light and dark modes
   - Verify on mobile devices

## 🎨 Color Reference

From your brand:
- Sage Light: `#F5F5F0`
- Mint: `#ABC5B6`
- Dark BG: `#2D3B45`
- Coral: `#FF6B6B`
- White: `#FFFFFF`

Use these in your OG image for brand consistency!

---

**After creating files, your previews will look professional on:**
- LinkedIn posts
- Twitter/X links
- Facebook shares
- Slack messages
- Discord embeds
- iMessage previews
- WhatsApp links
