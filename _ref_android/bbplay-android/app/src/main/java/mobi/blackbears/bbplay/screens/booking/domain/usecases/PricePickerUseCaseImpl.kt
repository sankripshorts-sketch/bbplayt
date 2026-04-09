package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.screens.booking.domain.model.price_picker.*
import java.time.*
import java.time.temporal.ChronoUnit
import javax.inject.Inject

private const val BREAK_START_TIME = 9
private const val END_NIGHT_TIME = 9
private const val START_TIME_MORNING_SHOW = 9
private const val END_TIME_MORNING_SHOW = 12
private const val START_TIME_NIGHT_SHOW = 21
private const val END_TIME_NIGHT_SHOW = 4

class PricePickerUseCaseImpl @Inject constructor(): PricePickerUseCase {
    private val startBreakTime = LocalTime.of(BREAK_START_TIME, 0)
    private val endNightTime = LocalTime.of(END_NIGHT_TIME, 0)
    private val startMorningTimeShow = LocalTime.of(START_TIME_MORNING_SHOW, 0)
    private val endMorningTimeShow = LocalTime.of(END_TIME_MORNING_SHOW, 0)
    private val startNightTimeShow = LocalTime.of(START_TIME_NIGHT_SHOW, 0)
    private val endNightTimeShow = LocalTime.of(END_TIME_NIGHT_SHOW, 0)

    override fun getPricesByTime(time: LocalTime): List<PricePicker> {
        var timeToMakeBooking: LocalTime
        val result = arrayListOf<PricePicker>()
        PricePickerType.values().forEach {
            if (!isPriceShow(it, time)) return@forEach
            val maxTimeToBooking = it.maxTimeToBooking
            val untilTimeInSeconds = getTimeBookingForProduct(it, time)
            timeToMakeBooking =
                if (untilTimeInSeconds < 0) maxTimeToBooking else LocalTime.ofSecondOfDay(untilTimeInSeconds)
            timeToMakeBooking =
                if (timeToMakeBooking >= maxTimeToBooking) maxTimeToBooking else timeToMakeBooking
            result.add(createPricePicker(timeToMakeBooking, it))
        }
        return result
    }

    /**
     * Т.к. метод isAfter или isBefore возвращает false когда у нас одиниковое время,
     * то нужно учесть данный сдвиг и прибавить или отнять минуты чтобы получить верное значение.
     * Допустим утренний пакет показывается с 9 до 12, но если мы укажем
     * time.isAfter(startMorningTimeShow), то получим false т.к. 9.isAfter(9) = false
     * Поэтому чтобы с 9 уже показывался пакет мы отнимаем минуту.
     */
    private fun isPriceShow(pickerType: PricePickerType, time: LocalTime): Boolean =
        when(pickerType) {
//            PricePickerType.MORNING -> time.isAfter(startMorningTimeShow.minusMinutes(1))
//                    && time.isBefore(endMorningTimeShow)
            PricePickerType.NIGHT -> time.isAfter(startNightTimeShow.minusMinutes(1))
                    || time.isBefore(endNightTimeShow.plusMinutes(1))
            else -> true
        }

    /**
     * Получить время относительно времени перерыва, или если утренний пакет, относительно
     * времени окончания утреннего пакета.
     * Утренний пакет имеет 4 часа игры с 9 до 13 но показывается он до 12. Поэтому к времени
     * конечному прибавляем 1 час чтобы высчитать фактически сколько будет сидеть человек.
     */
    private fun getTimeBookingForProduct(pickerType: PricePickerType, time: LocalTime): Long =
        when(pickerType) {
//            PricePickerType.MORNING -> time.until(endMorningTimeShow.plusHours(1), ChronoUnit.SECONDS)
            PricePickerType.NIGHT -> { getTimeNight(time) }
            else -> {
                val until = time.until(startBreakTime, ChronoUnit.SECONDS)
                if (until == 0L) {
                    val maxBookingTime = pickerType.maxTimeToBooking
                    val endTime = time.plusHours(maxBookingTime.hour.toLong()).plusMinutes(
                        maxBookingTime.minute.toLong()
                    )
                    ChronoUnit.SECONDS.between(time, endTime)
                } else {
                    until
                }
            }
        }

    /**
     * Получить доступное время бронирования.
     *      1 Рассчитываем разницу между временем и утренним закрытием.
     *      2 Если значение отрицательное значит нужно использовать время с датой,
     * чтобы корректно высчитать количество часов. Например
     * LocalTime(23).until(LocalTime(7)) выдаст значение -16,
     * но вот LocalDateTime(15.05.2023 23:00).until(LocalDateTime(16.06.2023 07:00))
     * выдаст нам значение корректнык 8 часов.
     * Поэтому если until поожительный то просто возвращаем его, иначе пересчитываем с
     * использованием даты.
     */
    private fun getTimeNight(time: LocalTime): Long {
        val until = time.until(endNightTime, ChronoUnit.SECONDS)
        return if (until < 0) {
            val currentDate = LocalDate.now()
            val dateTime = time.atDate(currentDate)
            val nextDateTime = endNightTime.atDate(currentDate.plusDays(1))
            dateTime.until(nextDateTime, ChronoUnit.SECONDS)
        } else {
            until
        }
    }

    private fun createPricePicker(time: LocalTime, pickerType: PricePickerType): PricePicker =
        PricePicker(
            timeToBooking = time,
            name = getResourceString(pickerType),
            type = pickerType
        )

    private fun getResourceString(pickerType: PricePickerType): Int =
        when(pickerType) {
//            PricePickerType.MORNING -> R.string.morning_text_with_slash
            PricePickerType.NIGHT -> R.string.night_text_with_slash
            PricePickerType.PRODUCT_3_HOURS ->  R.string.package_text_with_slash
            PricePickerType.PRODUCT_5_HOURS -> R.string.package_text_with_slash
            else -> R.string.empty_text
        }
}