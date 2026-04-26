#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="distill"
BIN_DIR="$HOME/.local/bin"
DATA_DIR="$HOME/.local/share/distill"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"

echo "==> Checking dependencies..."
MISSING=()
for pkg in fuse2 nodejs npm; do
  if ! pacman -Qq "$pkg" &>/dev/null; then
    MISSING+=("$pkg")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "==> Installing missing packages: ${MISSING[*]}"
  sudo pacman -S --needed --noconfirm "${MISSING[@]}"
fi

echo "==> Installing npm dependencies..."
cd "$SCRIPT_DIR"
npm install

echo "==> Building Distill..."
npm run build:linux

APPIMAGE=$(find "$SCRIPT_DIR/dist" -name "*.AppImage" | head -1)
if [ -z "$APPIMAGE" ]; then
  echo "ERROR: AppImage not found in dist/. Build may have failed." >&2
  exit 1
fi

echo "==> Installing AppImage to $BIN_DIR/$APP_NAME..."
mkdir -p "$BIN_DIR"
cp "$APPIMAGE" "$BIN_DIR/$APP_NAME"
chmod +x "$BIN_DIR/$APP_NAME"

echo "==> Copying backend to $DATA_DIR/backend..."
mkdir -p "$DATA_DIR"
rsync -a --delete \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.env' \
  --exclude 'data/chroma' \
  "$PROJECT_ROOT/backend/" "$DATA_DIR/backend/"

# Preserve existing .env if present
if [ ! -f "$DATA_DIR/backend/.env" ] && [ -f "$PROJECT_ROOT/backend/.env" ]; then
  cp "$PROJECT_ROOT/backend/.env" "$DATA_DIR/backend/.env"
fi

echo "==> Installing backend dependencies..."
cd "$DATA_DIR/backend"
poetry install --no-root 2>/dev/null || poetry install

# Find poetry executable for use in launcher
POETRY_BIN="$(command -v poetry || echo "$HOME/.local/bin/poetry")"

# Create wrapper script that sets up PATH and env for backend launch
cat > "$BIN_DIR/distill-launch" << WRAPPER
#!/usr/bin/env bash
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
export BACKEND_PATH="$DATA_DIR/backend"
export ELECTRON_OZONE_PLATFORM_HINT=wayland
exec "$BIN_DIR/$APP_NAME" "\$@"
WRAPPER
chmod +x "$BIN_DIR/distill-launch"

# Icon
ICON_PATH="$APP_NAME"
if [ -f "$SCRIPT_DIR/resources/icon.png" ]; then
  mkdir -p "$ICON_DIR"
  cp "$SCRIPT_DIR/resources/icon.png" "$ICON_DIR/$APP_NAME.png"
  ICON_PATH="$ICON_DIR/$APP_NAME.png"
fi

echo "==> Creating .desktop entry..."
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/$APP_NAME.desktop" << EOF
[Desktop Entry]
Name=Distill
Comment=Audio transcription and knowledge base
Exec=$BIN_DIR/distill-launch %U
Icon=$ICON_PATH
Terminal=false
Type=Application
Categories=Utility;AudioVideo;
StartupWMClass=distill
EOF

if command -v update-desktop-database &>/dev/null; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "Done. Launch with:"
echo "  distill-launch"
echo "Or find 'Distill' in your app launcher."
