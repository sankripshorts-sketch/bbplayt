package mobi.blackbears.bbplay.common.extensions

import android.content.Context
import android.os.SystemClock
import android.view.View
import android.widget.EditText
import android.widget.NumberPicker
import androidx.core.text.isDigitsOnly
import androidx.core.view.children
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import java.math.RoundingMode
import java.security.MessageDigest
import java.time.*
import java.time.format.*
import java.util.*

val regexDigital: Regex by lazy { "\\d".toRegex() }

const val FIRST_PLACE_REWARD_AMOUNT = 300
const val SECOND_PLACE_REWARD_AMOUNT = 200
const val THIRD_PLACE_REWARD_AMOUNT = 100

private const val ALGORITHM_ENCODE = "sha-256"
private const val SPACE = " "

/**
 * Возвращает пустую строку
 */
fun emptyString() = ""

/**
 * Кодируем строку в sha-256
 * @return Зашифрованную строку
 */
fun String.encodeString(): String {
    if(isEmpty()) return emptyString()

    val msgDigest = MessageDigest.getInstance(ALGORITHM_ENCODE)
    val bytes: ByteArray = msgDigest.digest(toByteArray())
    var result = "*"

    for (b in bytes) {
        var temp = Integer.toHexString(b.toInt() and 0xff)
        if (temp.length == 1) temp = "0$temp"
        result += temp
    }
    return result
}

/**
 * Пытается преобразвовать строку в число
 * @return Число, если преобразование удалось, иначе 0.
 */
fun String.castToInt(): Int =
    if (isDigitsOnly() && isNotBlank() && isNotEmpty())
        Integer.parseInt(this)
    else 0

/**
 * Пытается преобразвовать строку в число
 * @return Число, если преобразование удалось, иначе 0.0.
 */
fun String.castToDouble(): Double =
    try {
        toDouble()
    } catch (e: NumberFormatException) {
        0.0
    }

/**
 * Округляет число до 2 знаков формата #.##
 */
fun Double.roundToTwoCharacters(): Double =
    toBigDecimal().setScale(2, RoundingMode.UP).toDouble()

/**
 * Листенер, который не позволяет постоянно кликать по сущности. Можно установить режим задержки.
 * Изначально 1 сек.
 */
fun View.setBlockingClickListener(debounceTime: Long = 1000L, action: () -> Unit) {
    this.setOnClickListener(object : View.OnClickListener {
        private var lastClickTime: Long = 0
        override fun onClick(v: View) {
            val timeNow = SystemClock.elapsedRealtime()
            val elapsedTimeSinceLastClick = timeNow - lastClickTime

            if (elapsedTimeSinceLastClick < debounceTime)
                return
            else
                action()
            lastClickTime = SystemClock.elapsedRealtime()
        }
    })
}

/**
 * Удаляет из строки rub
 */
fun String.removeRubWord(): String = split(SPACE).firstOrNull() ?: emptyString()

/**
 * Удаляет все символы,которые не являются цифрами
 */
fun String.removeAllNotDigitChars(): String {
    if (this.isEmpty()) return this
    val result = StringBuilder()
    this.forEach {
        if (regexDigital.containsMatchIn(it.toString())) result.append(it)
    }
    return result.toString()
}

private const val UID_SEPARATOR = ":"
/**
 * Генерирует уникальный ключ на основе пользователя и девайса, когда пользователь вошёл.
 * Не вызывать нигде кроме как при входе в приложение. Значение вытаскивать через preferences.
 * @see PreferenceManager
 * @param memberId - айди пользователя при логине
 */
fun generateUidUser(memberId: String): String =
    UUID.randomUUID().toString().plus(UID_SEPARATOR).plus(memberId)

/**
 * Конвертируем в px
 */
fun Number.dpToPx(context: Context) = this.toFloat() * context.resources.displayMetrics.density

/**
 * Преобразует LocalDateTime в строку общего формата дат yyyy-MM-dd
 */
fun LocalDateTime.parseToGeneralDateString(): String {
    val formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    return this.format(formatter)
}

/**
 * Преобразует LocalDateTime в строку времени формата HH:mm
 */
fun LocalDateTime.parseToTimeString(): String {
    val formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm")
    return this.format(formatter)
}

/**
 * Преобразует строку в LocalDate, если преобразование не удалось,
 * возвращает LocalDate.MIN
 */
fun String.toLocalDate(formatter: DateTimeFormatter): LocalDate =
    try {
        LocalDate.parse(this, formatter)
    } catch (e: DateTimeParseException) {
        LocalDate.MIN
    }

/**
 * Превращает строку в LocalDateTime, если строка формата 2023-04-10T11:27:46, то formatter
 * указывать не надо. В других случаях нужно указать formatter для преобразования.
 * @return Дату если всё ок, и LocaleDateTime.MIN, если спарсить не удалось.
 */
fun String.parseToLocalDateTime(formatter: DateTimeFormatter? = null): LocalDateTime =
    try {
        if (formatter == null) LocalDateTime.parse(this)
        LocalDateTime.parse(this, formatter)
    } catch (e: DateTimeParseException) {
        LocalDateTime.MIN
    }

/**
 * Форматирует две даты в формат вида 01.01.2023 - 05.05.2023
 */
fun getStringFormatByStartAndEndDate(startDate: LocalDateTime, endDate: LocalDateTime): String {
    val formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    val startFormat = startDate.format(formatter)
    val endFormat = endDate.format(formatter)
    return "$startFormat - $endFormat"
}

/**
 * Генерирует рандомную строку длинной 8 символов
 */
fun getRandomString() = UUID.randomUUID().toString().substring(0, 8)

/**
 * Хэширует строку в формат md5, если строка пустая вернет пустую строку
 */
fun String.encodeStringToMD5(): String {
    if(isEmpty()) return emptyString()
    val msgDigest = MessageDigest.getInstance("MD5")
    val bytes: ByteArray = msgDigest.digest(toByteArray())
    var result = ""

    for (b in bytes) {
        var temp = Integer.toHexString(b.toInt() and 0xff)
        if (temp.length == 1) temp = "0$temp"
        result += temp
    }
    return result
}

/**
 * Преобразует строку в LocalDateTime, если преобразование не удалось,
 * возвращает LocalDateTime.MIN
 */
fun String.toLocalDateTime(formatter: DateTimeFormatter): LocalDateTime =
    try {
        LocalDateTime.parse(this, formatter)
    } catch (e: DateTimeParseException) {
        LocalDateTime.MIN
    }

/**
 * Когда мы делаем set formatter NumberPicker почему то первое выброанное значение всё равно
 * показывает либо индекс элемента, либо число отформатированное.
 * Также при блокировке клавиатуры на клик элемента picker у нас воспринимаются
 * клики и отображение может моргать. Решение
 * see more [stackOverFlow](https://stackoverflow.com/questions/17708325/android-numberpicker-with-formatter-doesnt-format-on-first-rendering/65603306#65603306)
 */
fun NumberPicker.fixUiBugOfNumberPicker() {
    children.forEach {
        if (it is EditText) it.filters = arrayOfNulls(0) //remove default input filter
    }
}


private val regexLinkWithText: Regex by lazy { "(\\[\\w+\\|)|(])".toRegex() }
/**
 * Из вконтакте приходит текстом с форматом [club21464693|Пиццерия Печь], т.е. ссылка.
 * Вырезает всё кроме текста. После сравнения возвращает 'Пиццерия Печь'.
 */
fun String.cutLinkInfoFromText(): String =
    this.replace(regexLinkWithText, emptyString())