package com.gfh.electricalworkbench

import android.content.Context
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

/** Saved appearance only; no effect on electrical math, account data, or entitlements. */
internal data class EWPalette(
    val background: Color, val raised: Color, val card: Color, val outline: Color,
    val primary: Color, val onPrimary: Color, val secondary: Color,
    val warning: Color, val text: Color, val muted: Color, val good: Color, val danger: Color
)
internal object EWColors {
    val options = listOf(
        "daylight" to "Daylight", "midnight" to "Midnight",
        "workshop" to "Warm Workshop", "contrast" to "High Contrast"
    )
    var selectedTheme by mutableStateOf("daylight")
        private set

    private val daylight = EWPalette(
        Color(0xFFF3F6FB), Color.White, Color.White, Color(0xFF91A4B9),
        Color(0xFF124A7A), Color.White, Color(0xFF1D4ED8), Color(0xFF874300),
        Color(0xFF14263D), Color(0xFF465870), Color(0xFF166534), Color(0xFFB42318)
    )
    private val midnight = EWPalette(
        Color(0xFF0B1727), Color(0xFF172B40), Color(0xFF192D42), Color(0xFF67859B),
        Color(0xFF78DFF2), Color(0xFF082431), Color(0xFF83DCEC), Color(0xFFFFCE85),
        Color(0xFFF2F8FF), Color(0xFFD0E0EA), Color(0xFF9DF5B5), Color(0xFFFFA6A0)
    )
    private val workshop = EWPalette(
        Color(0xFFF8F0E6), Color(0xFFFFFAF2), Color(0xFFFFFAF2), Color(0xFFBDA88E),
        Color(0xFF79411C), Color.White, Color(0xFF8C5127), Color(0xFF874200),
        Color(0xFF382A20), Color(0xFF604D3C), Color(0xFF17653D), Color(0xFFA42720)
    )
    private val contrast = EWPalette(
        Color.Black, Color(0xFF090909), Color(0xFF090909), Color.White,
        Color(0xFFFFE15C), Color.Black, Color(0xFFFFE15C), Color(0xFFFFE15C),
        Color.White, Color.White, Color(0xFFB2FFBF), Color(0xFFFFB5B0)
    )
    private val palette: EWPalette get() = when (selectedTheme) {
        "midnight" -> midnight
        "workshop" -> workshop
        "contrast" -> contrast
        else -> daylight
    }
    fun load(context: Context) {
        val id = context.getSharedPreferences("ewb.appearance.v1", Context.MODE_PRIVATE)
            .getString("theme", "daylight") ?: "daylight"
        selectedTheme = if (options.any { it.first == id }) id else "daylight"
    }
    fun choose(context: Context, theme: String) {
        if (!options.any { it.first == theme }) return
        selectedTheme = theme
        context.getSharedPreferences("ewb.appearance.v1", Context.MODE_PRIVATE)
            .edit().putString("theme", theme).apply()
    }
    val background get() = palette.background
    val raised get() = palette.raised
    val card get() = palette.card
    val outline get() = palette.outline
    val primary get() = palette.primary
    val onPrimary get() = palette.onPrimary
    val secondary get() = palette.secondary
    val warning get() = palette.warning
    val text get() = palette.text
    val muted get() = palette.muted
    val good get() = palette.good
    val danger get() = palette.danger
    val dark get() = selectedTheme == "midnight" || selectedTheme == "contrast"
}
@Composable
internal fun ElectricalUiTheme(content: @Composable () -> Unit) {
    val scheme = if (EWColors.dark) darkColorScheme(
        primary = EWColors.primary, onPrimary = EWColors.onPrimary,
        primaryContainer = EWColors.raised, onPrimaryContainer = EWColors.text,
        secondary = EWColors.secondary, onSecondary = EWColors.onPrimary,
        secondaryContainer = EWColors.raised, onSecondaryContainer = EWColors.text,
        background = EWColors.background, onBackground = EWColors.text,
        surface = EWColors.card, onSurface = EWColors.text,
        surfaceVariant = EWColors.raised, onSurfaceVariant = EWColors.muted,
        outline = EWColors.outline, error = EWColors.danger
    ) else lightColorScheme(
        primary = EWColors.primary, onPrimary = EWColors.onPrimary,
        primaryContainer = EWColors.raised, onPrimaryContainer = EWColors.text,
        secondary = EWColors.secondary, onSecondary = EWColors.onPrimary,
        secondaryContainer = EWColors.raised, onSecondaryContainer = EWColors.text,
        background = EWColors.background, onBackground = EWColors.text,
        surface = EWColors.card, onSurface = EWColors.text,
        surfaceVariant = EWColors.raised, onSurfaceVariant = EWColors.muted,
        outline = EWColors.outline, error = EWColors.danger
    )
    MaterialTheme(colorScheme = scheme, content = content)
}
