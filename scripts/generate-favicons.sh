#!/bin/bash

# Script to generate all favicon sizes from icon.svg
# Requires: ImageMagick (brew install imagemagick)

echo "🎨 Generating favicons from icon.svg..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

# Source and destination
SRC="src/app/icon.svg"
DEST="public"

# Check if source exists
if [ ! -f "$SRC" ]; then
    echo "❌ Source icon not found: $SRC"
    exit 1
fi

# Create public directory if it doesn't exist
mkdir -p "$DEST"

echo "📦 Generating icon-192.png..."
convert -background none "$SRC" -resize 192x192 "$DEST/icon-192.png"

echo "📦 Generating icon-512.png..."
convert -background none "$SRC" -resize 512x512 "$DEST/icon-512.png"

echo "📦 Generating apple-icon.png..."
convert -background none "$SRC" -resize 180x180 "$DEST/apple-icon.png"

echo "📦 Generating favicon.ico..."
convert -background none "$SRC" -resize 32x32 "$DEST/favicon.ico"

echo ""
echo "✅ All favicons generated successfully!"
echo ""
echo "Generated files:"
ls -lh "$DEST"/*.{png,ico} 2>/dev/null
echo ""
echo "📝 Next steps:"
echo "1. Create og-image.png (1200x630px) - see OG_IMAGE_AND_FAVICON_GUIDE.md"
echo "2. Deploy to production"
echo "3. Test with: https://www.opengraph.xyz/"
