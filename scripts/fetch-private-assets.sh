#!/usr/bin/env bash
set -euo pipefail

# Fetch TradingView charting library and private fonts at build-time.
# If env vars are missing, skip gracefully and rely on repo copies.

echo "[fetch-private-assets] starting"

# TradingView charting library
if [ -n "${CHARTING_ZIP_URL:-}" ]; then
  echo "[fetch-private-assets] downloading charting library"
  CHART_TMP="$(mktemp -d)"
  curl -fsSL "$CHARTING_ZIP_URL" -o "$CHART_TMP/charting_library.zip"
  unzip -oq "$CHART_TMP/charting_library.zip" -d "$CHART_TMP"

  # Determine source folder inside the ZIP
  SRC_CHART_DIR=""
  if [ -d "$CHART_TMP/public/static/charting_library" ]; then
    SRC_CHART_DIR="$CHART_TMP/public/static/charting_library"
  elif [ -d "$CHART_TMP/charting_library" ]; then
    SRC_CHART_DIR="$CHART_TMP/charting_library"
  elif [ -f "$CHART_TMP/charting_library.js" ] || [ -d "$CHART_TMP/bundles" ]; then
    SRC_CHART_DIR="$CHART_TMP"
  else
    # Try to detect a single top-level directory
    TOP_DIR=$(find "$CHART_TMP" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)
    if [ -n "$TOP_DIR" ] && { [ -f "$TOP_DIR/charting_library.js" ] || [ -d "$TOP_DIR/bundles" ]; }; then
      SRC_CHART_DIR="$TOP_DIR"
    fi
  fi

  mkdir -p public/static/charting_library
  rm -rf public/static/charting_library/*
  if [ -n "$SRC_CHART_DIR" ]; then
    cp -R "$SRC_CHART_DIR"/* public/static/charting_library/
  fi

  if [ ! -f public/static/charting_library/charting_library.js ]; then
    echo "[fetch-private-assets] ERROR: charting_library.js missing after fetch" >&2
    echo "[fetch-private-assets] Looked in: $SRC_CHART_DIR" >&2
    exit 1
  fi
  rm -rf "$CHART_TMP"
else
  echo "[fetch-private-assets] CHARTING_ZIP_URL not set; using repo copy if present"
fi

# Fonts bundle (public/fonts and/or src/fonts/abc-favorit.woff2)
if [ -n "${FONTS_ZIP_URL:-}" ]; then
  echo "[fetch-private-assets] downloading fonts bundle"
  FONTS_TMP="$(mktemp -d)"
  curl -fsSL "$FONTS_ZIP_URL" -o "$FONTS_TMP/fonts_bundle.zip"
  unzip -oq "$FONTS_TMP/fonts_bundle.zip" -d "$FONTS_TMP"

  # public/fonts
  DEST_PUBLIC_FONTS="public/fonts"
  mkdir -p "$DEST_PUBLIC_FONTS"
  if [ -d "$FONTS_TMP/public/fonts" ]; then
    cp -R "$FONTS_TMP/public/fonts/"* "$DEST_PUBLIC_FONTS/" 2>/dev/null || true
  elif [ -d "$FONTS_TMP/fonts" ]; then
    cp -R "$FONTS_TMP/fonts/"* "$DEST_PUBLIC_FONTS/" 2>/dev/null || true
  else
    # As a fallback, copy any known font directories to public/fonts
    for d in "Helvetica Now" SF Favorit; do
      if [ -d "$FONTS_TMP/$d" ]; then
        mkdir -p "$DEST_PUBLIC_FONTS/$d"
        cp -R "$FONTS_TMP/$d/"* "$DEST_PUBLIC_FONTS/$d/" 2>/dev/null || true
      fi
    done
  fi

  # src/fonts/abc-favorit.woff2
  mkdir -p src/fonts
  if [ -f "$FONTS_TMP/src/fonts/abc-favorit.woff2" ]; then
    cp -f "$FONTS_TMP/src/fonts/abc-favorit.woff2" src/fonts/abc-favorit.woff2
  else
    FAVORIT_PATH=$(find "$FONTS_TMP" -type f -name 'abc-favorit.woff2' | head -n 1 || true)
    if [ -n "$FAVORIT_PATH" ]; then
      cp -f "$FAVORIT_PATH" src/fonts/abc-favorit.woff2
    fi
  fi

  if [ ! -f src/fonts/abc-favorit.woff2 ]; then
    echo "[fetch-private-assets] WARNING: src/fonts/abc-favorit.woff2 not found after fetch" >&2
  fi
  rm -rf "$FONTS_TMP"
else
  echo "[fetch-private-assets] FONTS_ZIP_URL not set; using repo copy if present"
fi

echo "[fetch-private-assets] done"