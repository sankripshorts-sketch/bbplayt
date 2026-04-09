package mobi.blackbears.bbplay.screens.events.fragments.detail_event.decorator

import android.content.Context
import android.text.Spannable
import android.text.style.*
import androidx.core.text.toSpannable
import mobi.blackbears.bbplay.R

class TopWinner(
    private val rank: Int,
    private val rewardAmount: Int,
    private val isRewardEnabled: Boolean
) : ResourceStringDecorator {
    override fun getStringById(context: Context): Spannable {
        return if (isRewardEnabled) {
            context.getString(
                R.string.get_reward_format_text,
                rank,
                context.getString(R.string.show_balance, rewardAmount)
            )
        } else {
            context.getString(
                R.string.reward_taken_format_text,
                rank,
                context.getString(R.string.show_balance, rewardAmount)
            )
        }
            .toSpannable()
            .apply {
                //Меняет размер текста
                setSpan(
                    AbsoluteSizeSpan(14, true),
                    0,
                    this.indexOf("\n"),
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                /*сдвигает часть текста вверх, с полем android:lineSpacingMultiplier="0.6" в кнопке
                 *позволяет выравнить по вертикали текст в две линии
                 */
                setSpan(
                    SuperscriptSpan(),
                    0,
                    this.indexOf("\n"),
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
            }
    }

}