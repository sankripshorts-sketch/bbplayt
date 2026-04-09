package mobi.blackbears.bbplay.common.views

import android.content.Context
import android.text.InputType
import android.util.AttributeSet
import androidx.appcompat.widget.AppCompatEditText
import mobi.blackbears.bbplay.common.extensions.regexDigital

private const val CHAR_INTERNATIONAL_FORMAT = '+'
private const val CHAR_RUS_CODE_COUNTRY = '7'
private const val INTERNATIONAL_FORMAT_WITH_RUS_CODE = "+7"
private const val SPACE = " "
private val regexFirstChar = "7|8+".toRegex()

class BbInputEditTextView : AppCompatEditText {

    constructor(context: Context) : super(context)

    constructor(context: Context, attrs: AttributeSet) : super(context, attrs)

    constructor(context: Context, attrs: AttributeSet, defStyle: Int) : super(
        context,
        attrs,
        defStyle
    )

    override fun onTextContextMenuItem(id: Int): Boolean {
        val consumed = super.onTextContextMenuItem(id)
        if (isPhoneInput()) addEventById(id)
        return consumed
    }

    private fun isPhoneInput(): Boolean = this.inputType == InputType.TYPE_CLASS_PHONE

    private fun addEventById(id: Int) {
        when (id) {
            android.R.id.paste -> {
                val formatExpression = removeAllNotDigitChars()
                setText(makePhoneByMask(formatExpression))
            }
            android.R.id.cut -> setText(INTERNATIONAL_FORMAT_WITH_RUS_CODE)
        }
        text?.let { setSelection(it.length) }
    }

    private fun removeAllNotDigitChars(): MutableList<Char> {
        val result = mutableListOf<Char>()
        text?.forEach {
            if (regexDigital.containsMatchIn(it.toString())) result.add(it)
        }
         return result
    }

    private fun makePhoneByMask(chars: MutableList<Char>): String {
        if (chars.isEmpty()) return INTERNATIONAL_FORMAT_WITH_RUS_CODE
        if (chars.size == 1) return INTERNATIONAL_FORMAT_WITH_RUS_CODE + SPACE + chars.first().toString()
        //Если 11 цифр, char[0] заменяем на 7
        if (chars.size == 11) chars[0] = CHAR_RUS_CODE_COUNTRY
        //Если char[1] = 8 или 7, удаляем его
        if (regexFirstChar.containsMatchIn(chars[1].toString())) chars.removeAt(1)

        val result = StringBuilder()
        result.append(CHAR_INTERNATIONAL_FORMAT)

        chars.forEach {
            val length = result.length
            if (length == 2 || length == 6 || length == 10 || length == 13) result.append(SPACE)
            result.append(it)
        }
        return result.toString()
    }
}