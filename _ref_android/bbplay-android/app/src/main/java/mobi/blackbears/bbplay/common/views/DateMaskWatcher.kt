package mobi.blackbears.bbplay.common.views

import android.text.Editable
import android.text.TextWatcher
import mobi.blackbears.bbplay.common.extensions.regexDigital

private const val SEPARATOR_FOR_DATE_TYPE = '.'

class DateMaskWatcher : TextWatcher {
    private var isAddChar = false
    private var isRunning = false

    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {
        isAddChar = count < after
    }

    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}

    override fun afterTextChanged(s: Editable?) {
        if (isRunning || !isAddChar) return
        isRunning = true

        val listNumbers = removeAllNotDigitChars(s)
        val textWithMask = makeDateByMask(listNumbers)

        s?.let { it.replace(0, it.length, textWithMask) }

        isRunning = false
    }

    private fun removeAllNotDigitChars(editable: Editable?): List<Char> {
        val result = mutableListOf<Char>()
        editable?.forEach {
            if (regexDigital.containsMatchIn(it.toString())) result.add(it)
        }
        return result
    }

    private fun makeDateByMask(chars: List<Char>): String {
        val result = StringBuilder()

        chars.forEach {
            result.append(it)

            val length = result.length
            if (length == 2 || length == 5) result.append(SEPARATOR_FOR_DATE_TYPE)
        }
        return result.toString()
    }
}