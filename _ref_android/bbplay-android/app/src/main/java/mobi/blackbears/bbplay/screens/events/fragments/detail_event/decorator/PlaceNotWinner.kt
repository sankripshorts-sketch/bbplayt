package mobi.blackbears.bbplay.screens.events.fragments.detail_event.decorator

import android.content.Context
import android.text.Spannable
import androidx.core.text.toSpannable
import mobi.blackbears.bbplay.R

class PlaceNotWinner(private val place: Int) : ResourceStringDecorator {
    override fun getStringById(context: Context): Spannable =
        context.getString(R.string.place_not_winner_text, place).toSpannable()
}