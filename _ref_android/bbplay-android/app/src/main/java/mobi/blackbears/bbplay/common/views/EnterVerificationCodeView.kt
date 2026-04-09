package mobi.blackbears.bbplay.common.views

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.LayerDrawable
import android.graphics.drawable.ShapeDrawable
import android.graphics.drawable.shapes.RoundRectShape
import android.text.InputFilter
import android.text.InputType
import android.util.AttributeSet
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import androidx.core.content.res.ResourcesCompat
import androidx.core.widget.addTextChangedListener
import mobi.blackbears.bbplay.R

private const val DEFAULT_LENGTH = 4
private const val DEFAULT_TEXT_SIZE = 18f
private const val DEFAULT_TEXT_COLOR = Color.BLACK

typealias ChangeCodeListener = (isComplete: Boolean, code: String) -> Unit

class EnterVerificationCodeView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0,
) : LinearLayout(context, attrs, defStyleAttr) {

    private var listener: ChangeCodeListener? = null

    fun setOnCodeCompleteListener(l: ChangeCodeListener?) {
        listener = l
    }

    private fun notifyCodeChange(code: String) {
        listener?.invoke(isCodeComplete(), code)
    }

    private val inputCells = mutableListOf<EditText>()

    private var codeLength: Int = DEFAULT_LENGTH
    private var codeTextSize: Float = DEFAULT_TEXT_SIZE
    private var codeTextColor: Int = DEFAULT_TEXT_COLOR
    private var codeTypeface: Typeface? =
        ResourcesCompat.getFont(context, R.font.din_round_pro_bold)

    init {
        orientation = HORIZONTAL

        attrs?.let {
            val typedArray =
                context.obtainStyledAttributes(it, R.styleable.EnterVerificationCodeView, 0, 0)

            typedArray.apply {
                try {
                    codeLength =
                        getInt(R.styleable.EnterVerificationCodeView_codeLength, DEFAULT_LENGTH)
                    codeTextColor = getColor(
                        R.styleable.EnterVerificationCodeView_textColor,
                        DEFAULT_TEXT_COLOR
                    )
                    codeTextSize = getDimension(
                        R.styleable.EnterVerificationCodeView_textSize,
                        DEFAULT_TEXT_SIZE
                    )
                    val fontId = getResourceId(R.styleable.EnterVerificationCodeView_font, -1)
                    if (fontId != -1) {
                        codeTypeface = ResourcesCompat.getFont(context, fontId)
                    }
                } finally {
                    recycle()
                }
            }
        }

        initInputCells(context)
    }

    private fun getEnteredCode(): String =
        inputCells.joinToString(separator = "") { it.text.toString() }

    private fun isCodeComplete(): Boolean = inputCells.count { it.text.isNotEmpty() } == codeLength

    private fun initInputCells(context: Context) {
        repeat(codeLength) { index ->
            val editText = EditText(context).apply {
                this.setup(index)
            }

            addView(editText)
            inputCells.add(editText)
        }
    }

    private fun EditText.setup(index: Int) {
        layoutParams =
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                marginEnd = if (index < codeLength - 1) (codeTextSize / 2).toInt() else 0
                width = (codeTextSize * 1.5).toInt()
                setPadding(0, 0, 0, (codeTextSize / 3).toInt())
            }

        inputType = InputType.TYPE_CLASS_NUMBER
        textAlignment = View.TEXT_ALIGNMENT_CENTER

        filters = arrayOf(InputFilter.LengthFilter(1))
        setTextSize(TypedValue.COMPLEX_UNIT_PX, codeTextSize)
        setTextColor(codeTextColor)
        typeface = codeTypeface
        background = getCellBackground()

        addTextChangedListener { s ->
            if (s.toString().isEmpty() && index > 0) {
                if (inputCells[index - 1].text.isEmpty()) {
                    inputCells[index - 1].requestFocus()
                }
            } else if (s.toString().isNotEmpty() && index < codeLength - 1) {
                inputCells[index + 1].requestFocus()
            }

            notifyCodeChange(getEnteredCode())
        }

        setOnKeyListener { _, keyCode, event ->
            if (event.action == KeyEvent.ACTION_DOWN
                && keyCode == KeyEvent.KEYCODE_DEL
                && index > 0
                && inputCells[index].text.isEmpty()
            ) {
                inputCells[index - 1].text.clear()
                inputCells[index - 1].requestFocus()
                return@setOnKeyListener true
            }

            false
        }
    }

    private fun getUnderScopeShapeDrawable() = ShapeDrawable().apply {
        intrinsicHeight = (codeTextSize / 8).toInt()
        paint.color = codeTextColor
        shape = RoundRectShape(
            floatArrayOf(50f, 50f, 50f, 50f, 50f, 50f, 50f, 50f), // Скругление углов
            null,
            null
        )
    }

    private fun getCellBackground(): LayerDrawable {
        val layers = arrayOf<Drawable>(getUnderScopeShapeDrawable())
        val layerDrawable = LayerDrawable(layers).apply {
            setLayerGravity(0, Gravity.BOTTOM)
            setLayerInset(0, 0, 0, 0, 0)
        }

        return layerDrawable
    }
}