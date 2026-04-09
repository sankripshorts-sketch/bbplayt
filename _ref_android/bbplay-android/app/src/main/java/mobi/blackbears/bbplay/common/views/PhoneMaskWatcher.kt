package mobi.blackbears.bbplay.common.views

import android.text.Editable
import android.text.TextWatcher
import mobi.blackbears.bbplay.common.extensions.regexDigital

private const val CHAR_INTERNATIONAL_FORMAT = '+'
private const val SPACE = " "

class PhoneMaskWatcher : TextWatcher {
    private var isAddChar = false
    private var isRunning = false

    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
        isAddChar = count < after
    }

    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}

    override fun afterTextChanged(s: Editable?) {
        addNotClearFirstSymbolsPhone(s)

        if (isRunning || !isAddChar) return
        isRunning = true

        val listNumbers = removeAllNotDigitChars(s)
        val textWithMask = makePhoneByMask(listNumbers)

        s?.let { it.replace(0, it.length, textWithMask) }

        isRunning = false
    }

    private fun addNotClearFirstSymbolsPhone(editable: Editable?) {
        if (editable?.length == 2) editable.append(SPACE)
    }

    private fun removeAllNotDigitChars(editable: Editable?): MutableList<Char> {
        val result = mutableListOf<Char>()
        editable?.forEach {
            if (regexDigital.containsMatchIn(it.toString())) result.add(it)
        }
        return result
    }

    private fun makePhoneByMask(chars: MutableList<Char>): String {
        val result = StringBuilder()
        result.append(CHAR_INTERNATIONAL_FORMAT)

        chars.forEach {
            result.append(it)
            val length = result.length
            if (length == 2 || length == 6 || length == 10 || length == 13) result.append(SPACE)
        }
        return result.toString()
    }
}