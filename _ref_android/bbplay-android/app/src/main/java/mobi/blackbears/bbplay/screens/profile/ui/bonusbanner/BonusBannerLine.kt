package mobi.blackbears.bbplay.screens.profile.ui.bonusbanner

import android.content.Context
import android.content.res.ColorStateList
import android.util.AttributeSet
import android.view.LayoutInflater
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.content.ContextCompat
import androidx.databinding.DataBindingUtil
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.databinding.ItemBonusLineBinding

class BonusBannerLine @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : ConstraintLayout(context, attrs, defStyleAttr) {

    private var binding: ItemBonusLineBinding

    init {
        val inflater = LayoutInflater.from(context)

        binding = DataBindingUtil.inflate(inflater, R.layout.item_bonus_line, this, true)

        attrs?.let {
            context.obtainStyledAttributes(it, R.styleable.BonusBannerLine, 0, 0).apply {
                val valueNameBgDefaultColor = ContextCompat.getColor(context, R.color.green_dark)
                val valueNameBgColor = getColor(R.styleable.BonusBannerLine_valueNameBgColor, valueNameBgDefaultColor)
                binding.bgValue.backgroundTintList = ColorStateList.valueOf(valueNameBgColor)

                val bonusAmountBgDefaultColor = ContextCompat.getColor(context, R.color.red_light)
                val bonusAmountBgColor = getColor(R.styleable.BonusBannerLine_bonusAmountBgColor, bonusAmountBgDefaultColor)
                binding.bgBonusAmount.backgroundTintList = ColorStateList.valueOf(bonusAmountBgColor)

                val valueNameTextDefaultColor = ContextCompat.getColor(context, R.color.aqua_glass)
                val valueNameTextColor = getColor(R.styleable.BonusBannerLine_valueNameTextColor, valueNameTextDefaultColor)
                binding.tvValue.setTextColor(valueNameTextColor)

                val bonusAmountTextDefaultColor = ContextCompat.getColor(context, R.color.aqua_glass)
                val bonusAmountTextColor = getColor(R.styleable.BonusBannerLine_bonusAmountTextColor, bonusAmountTextDefaultColor)
                binding.tvBonusAmount.setTextColor(bonusAmountTextColor)

                val valueName = getString(R.styleable.BonusBannerLine_valueName)
                binding.tvValue.text = valueName

                val bonusAmount = getString(R.styleable.BonusBannerLine_bonusAmount)
                binding.tvBonusAmount.text = bonusAmount

                recycle()
            }
        }
    }
}