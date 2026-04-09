package mobi.blackbears.bbplay.screens.login.fragments.verification

import android.os.CountDownTimer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private const val ONE_SECOND_IN_MS = 1000L

class ResendTimerDecorator(
    private val scope: CoroutineScope,
    private val onTick: (secondsToResend: Int) -> Unit,
    private val onFinish: () -> Unit
) {
    private var timer: CountDownTimer? = null

    fun startCountDownTo(timeOfNextResend: Long) {
        timer?.cancel()

        val nextRequestCodeTimeStampMs = timeOfNextResend * 1000
        val currentTimeStampMs = System.currentTimeMillis()

        if (currentTimeStampMs >= nextRequestCodeTimeStampMs) {
            onFinish()
            return
        }

        val timeToResend = nextRequestCodeTimeStampMs - currentTimeStampMs

        scope.launch(Dispatchers.Main) {
            timer = object : CountDownTimer(timeToResend, ONE_SECOND_IN_MS) {
                override fun onTick(millisUntilFinished: Long) {
                    this@ResendTimerDecorator.onTick(
                        (millisUntilFinished / ONE_SECOND_IN_MS).toInt()
                    )
                }

                override fun onFinish() {
                    this@ResendTimerDecorator.onFinish()
                }

            }.start()
        }
    }

    fun clear() {
        timer?.cancel()
        timer = null
    }
}