package mobi.blackbears.bbplay.common.views

import android.content.Context
import android.content.res.ColorStateList
import android.content.res.TypedArray
import android.text.InputFilter
import android.text.InputType
import android.text.style.ForegroundColorSpan
import android.util.AttributeSet
import android.util.Patterns
import android.view.LayoutInflater
import android.widget.EditText
import android.widget.FrameLayout
import androidx.annotation.ColorRes
import androidx.core.content.ContextCompat
import androidx.core.text.set
import androidx.core.view.get
import androidx.core.widget.addTextChangedListener
import com.google.android.material.textfield.TextInputLayout
import com.google.android.material.textfield.TextInputLayout.END_ICON_PASSWORD_TOGGLE
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.databinding.BbEditTextViewBinding

private val dateRegex =
    "^(0[1-9]|[12][0-9]|3[01])\\.(0[1-9]|1[012])\\.((19|2[0-9])[0-9]{2})$".toRegex()
private const val DATE_TYPE_MAX_CHARS = 10

private const val EMAIL_TYPE_MAX_CHARS = 40

private val phoneRegex = "\\+7 \\d{3} \\d{3} \\d{2} \\d{2}$".toRegex()
private const val FIRST_NUMBER_IN_PHONE = "+7"
private const val PHONE_TYPE_MAX_CHARS = 20

class BbTextLayoutWithEditTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
    defStyleRes: Int = 0
) : FrameLayout(context, attrs, defStyleAttr, defStyleRes) {
    private val binding = BbEditTextViewBinding.inflate(LayoutInflater.from(context), this, true)

    private val colorStateListEmptyText =
        ContextCompat.getColorStateList(context, R.color.border_color_empty_edit_text)
    private val colorStateListIsText =
        ContextCompat.getColorStateList(context, R.color.border_color_char_edit_text)
    private val colorStateListError =
        ContextCompat.getColorStateList(context, R.color.border_color_error)

    private val colorText = resources.getColor(R.color.white, resources.newTheme())
    private val colorErrorText = resources.getColor(R.color.bb_red_error, resources.newTheme())

    private var textIsNotEmptyListener: ((Boolean) -> Unit)? = null
    private var correctPhoneChangeFocusListener: (() -> Unit)? = null

    private var textHint: CharSequence?
        get() = binding.editText.hint
        set(value) {
            binding.editText.hint = value
        }

    init {
        val attributes = context.obtainStyledAttributes(
            attrs,
            R.styleable.BbTextLayoutWithEditTextView,
            defStyleAttr,
            defStyleRes
        )
        textHint = attributes.getText(R.styleable.BbTextLayoutWithEditTextView_hintText)
        binding.editText.id = this.id
        binding.editText.isEnabled =
            attributes.getBoolean(R.styleable.BbTextLayoutWithEditTextView_isEnabled, true)
        setAttributeInputType(attributes)
        setAttributeDrawable(attributes)
        attributes.recycle()

        setEditTextFocusListener()
        setEditTextWatcher()
    }

    private val inputTypeActions: Map<Int, (EditText, TextInputLayout) -> Unit>
        get() = mapOf(
            InputType.TYPE_TEXT_VARIATION_PASSWORD to { _, layout ->
                layout.endIconMode = TextInputLayout.END_ICON_PASSWORD_TOGGLE
            },
            InputType.TYPE_DATETIME_VARIATION_DATE to { edit, _ ->
                edit.filters = arrayOf(InputFilter.LengthFilter(DATE_TYPE_MAX_CHARS))
            },
            InputType.TYPE_CLASS_PHONE to { edit, _ ->
                edit.filters = arrayOf(InputFilter.LengthFilter(PHONE_TYPE_MAX_CHARS))
            },
            InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS to { edit, _ ->
                edit.filters = arrayOf(InputFilter.LengthFilter(EMAIL_TYPE_MAX_CHARS))
            }
        )


    private fun setAttributeInputType(attributes: TypedArray) {
        val inputType = attributes.getInt(
            R.styleable.BbTextLayoutWithEditTextView_typeInEdit,
            InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        )
        binding.editText.inputType = inputType

        inputTypeActions[inputType]?.invoke(binding.editText, binding.textInputLayout)
    }

    private fun setAttributeDrawable(attributes: TypedArray) {
        val drawableStart =
            attributes.getDrawable(R.styleable.BbTextLayoutWithEditTextView_iconStart)
        binding.editText.setCompoundDrawablesRelativeWithIntrinsicBounds(
            drawableStart,
            null,
            null,
            null
        )
    }

    private fun setEditTextFocusListener() {
        binding.editText.setOnFocusChangeListener { _, hasFocus ->
            addFirstNumberInEditText(hasFocus)
        }
    }

    private fun addFirstNumberInEditText(hasFocus: Boolean) {
        val editText = binding.editText
        val editable = editText.text ?: return
        if (isPhoneInput() && hasFocus && editable.isEmpty()) {
            editText.setText(FIRST_NUMBER_IN_PHONE)
            editText.setSelection(editText.length())
        }
    }

    private fun setEditTextWatcher() {
        binding.editText.let {
            if (isPhoneInput()) it.addTextChangedListener(PhoneMaskWatcher())
            if (isDateInput()) it.addTextChangedListener(DateMaskWatcher())

            it.addTextChangedListener {
                it?.let { editable ->
                    if (editable.isNotEmpty()) {
                        changeDrawableColor(R.color.white)
                        changeColorStateList(colorStateListIsText)
                        textIsNotEmptyListener?.invoke(true)
                        checkNumberPhone()
                        checkEmail()
                        checkDate()
                    } else {
                        changeDrawableColor(R.color.grey_light)
                        changeColorStateList(colorStateListEmptyText)
                        textIsNotEmptyListener?.invoke(false)
                    }
                }
            }
        }
    }

    private fun checkEmail() {
        if (isEmailInput()) {
            val text = binding.editText.text.toString()

            if (Patterns.EMAIL_ADDRESS.matcher(text).matches()) {
                changeTextColor(colorText)
                textIsNotEmptyListener?.invoke(true)
                binding.emailErrorText.visibility = GONE
            } else {
                binding.emailErrorText.text = context.getString(R.string.email_error_input)
                binding.emailErrorText.visibility = VISIBLE
                changeTextColor(colorErrorText)
                changeColorStateList(colorStateListError)
                changeDrawableColor(R.color.bb_red_error)
                textIsNotEmptyListener?.invoke(false)
            }
        }
    }

    private fun checkNumberPhone() {
        if (isPhoneInput()) {
            val text = binding.editText.text

            if (phoneRegex.containsMatchIn(text.toString())) {
                changeTextColor(colorText)
                textIsNotEmptyListener?.invoke(true)
                binding.editText.clearFocus()
                correctPhoneChangeFocusListener?.invoke()
            } else {
                changeTextColor(colorErrorText)
                changeColorStateList(colorStateListError)
                changeDrawableColor(R.color.bb_red_error)
                textIsNotEmptyListener?.invoke(false)
            }
        }
    }

    private fun checkDate() {
        if (isDateInput()) {
            if (dateRegex.containsMatchIn(binding.editText.text.toString())) {
                changeTextColor(colorText)
                textIsNotEmptyListener?.invoke(true)
            } else {
                changeTextColor(colorErrorText)
                changeColorStateList(colorStateListError)
                changeDrawableColor(R.color.bb_red_error)
                textIsNotEmptyListener?.invoke(false)
            }
        }
    }

    private fun changeTextColor(colorInt: Int) {
        binding.editText.text?.apply { set(0, length, ForegroundColorSpan(colorInt)) }
    }

    private fun changeDrawableColor(@ColorRes colorRes: Int) {
        val startIcon = binding.editText.compoundDrawables.firstOrNull()
        startIcon?.setTint(resources.getColor(colorRes, context.theme))
    }

    private fun changeColorStateList(colorList: ColorStateList?) {
        colorList?.let {
            binding.textInputLayout.setBoxStrokeColorStateList(colorList)
        }
    }

    private fun isEmailInput(): Boolean {
        val type = binding.editText.inputType ?: return false
        return (type and InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS) == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
    }

    private fun isPhoneInput(): Boolean =
        binding.editText.inputType == InputType.TYPE_CLASS_PHONE

    private fun isDateInput(): Boolean =
        binding.editText.inputType == InputType.TYPE_CLASS_DATETIME or InputType.TYPE_DATETIME_VARIATION_DATE

    fun addTextIsNotEmptyListener(listener: (Boolean) -> Unit) {
        this.textIsNotEmptyListener = listener
    }

    fun addPhoneCorrectFocusChangeListener(listener: () -> Unit) {
        this.correctPhoneChangeFocusListener = listener
    }

    fun setFocus() {
        binding.editText.requestFocus()
    }

    fun getText(): String = binding.editText.text.toString()

    fun setText(text: String) {
        binding.editText.setText(text)
    }
}