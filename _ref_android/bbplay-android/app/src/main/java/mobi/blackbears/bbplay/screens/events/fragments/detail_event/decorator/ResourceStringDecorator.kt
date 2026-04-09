package mobi.blackbears.bbplay.screens.events.fragments.detail_event.decorator

import android.content.Context
import android.text.Spannable

interface ResourceStringDecorator {
    fun getStringById(context: Context): Spannable
}