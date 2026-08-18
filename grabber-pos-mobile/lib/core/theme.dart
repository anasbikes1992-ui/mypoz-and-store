import 'package:flutter/material.dart';

/// Dark theme mirroring the GRABBER POS Studio web app.
class AppTheme {
  static const surface0 = Color(0xFF14161C);
  static const surface1 = Color(0xFF1B1E26);
  static const surface2 = Color(0xFF222633);
  static const line = Color(0xFF2C3140);
  static const accent = Color(0xFF34D399);
  static const accentInk = Color(0xFF06281C);
  static const warn = Color(0xFFE6B450);
  static const danger = Color(0xFFE5484D);
  static const textStrong = Color(0xFFF3F5F7);
  static const textDim = Color(0xFF8A93A6);

  static ThemeData build() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: surface0,
      colorScheme: base.colorScheme.copyWith(
        primary: accent,
        surface: surface1,
        error: danger,
      ),
      cardColor: surface1,
      dividerColor: line,
      textTheme: base.textTheme.apply(
        bodyColor: textStrong,
        displayColor: textStrong,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface2,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: accent),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: accentInk,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
    );
  }
}
