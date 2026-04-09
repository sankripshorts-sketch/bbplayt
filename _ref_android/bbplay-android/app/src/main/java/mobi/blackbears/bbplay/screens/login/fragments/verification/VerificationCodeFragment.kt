package mobi.blackbears.bbplay.screens.login.fragments.verification

import android.content.Context
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.style.UnderlineSpan
import android.view.View
import android.widget.Toast
import androidx.activity.addCallback
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.hideOrShowBottomNavigation
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentVerificationCodeBinding
import mobi.blackbears.bbplay.screens.login.di.DaggerLoginComponent
import javax.inject.Inject

class VerificationCodeFragment :
    BindingFragment<FragmentVerificationCodeBinding>(FragmentVerificationCodeBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<VerificationCodeViewModel> { factory }

    private var shouldShowBottomNavigationAfterDestroy = true

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerLoginComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requireActivity().hideOrShowBottomNavigation(false)
        setCodeSentTextView()
        setNavigation()
        setupButtonListeners()
        setErrorFlow()
    }

    private fun setNavigation() {
        with(binding) {
            btBackNavigate.setOnClickListener {
                back()
            }
        }

        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            back()
        }

        viewModel.navCommand.observe(viewLifecycleOwner) {
            findNavController().safeNavigate(it)
        }
    }

    private fun setCodeSentTextView() {
        binding.tvCodeSent.text = resources.getString(R.string.code_sent_info, viewModel.phoneNumber)
    }

    private fun setupButtonListeners() {
        with(binding) {
            viewModel.isContinueButtonEnabled.observe(viewLifecycleOwner) {
                btContinue.isEnabled = it
            }

            viewModel.isResendButtonEnable.observe(viewLifecycleOwner) { isEnable ->
                tvCodeNotReceived.isClickable = isEnable
                if (isEnable) {
                    tvCodeNotReceived.text =
                        getString(R.string.code_not_received).toUnderlineSpannable()
                }
            }

            viewModel.timeToResend.observe(viewLifecycleOwner) { timeToResend ->
                timeToResend.takeIf { it > 0 }?.let {
                    tvCodeNotReceived.text =
                        getString(
                            R.string.time_to_request_code_again,
                            timeToResend.toTimeString()
                        ).toUnderlineSpannable()
                }
            }

            tvCodeNotReceived.setBlockingClickListener {
                viewModel.requestCode()
            }

            btContinue.setBlockingClickListener {
                viewModel.verifyNumber()
            }

            enterCodeView.setOnCodeCompleteListener(viewModel::onChangeCodeListener)
        }
    }

    private fun back() {
        shouldShowBottomNavigationAfterDestroy = false
        findNavController().navigateUp()
    }

    private fun setErrorFlow() {
        viewModel.errorFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        requireActivity().hideOrShowBottomNavigation(shouldShowBottomNavigationAfterDestroy)
        shouldShowBottomNavigationAfterDestroy = true
        super.onDestroyView()
    }

    private fun Int.toTimeString(): String {
        val min = String.format("%02d", this / 60)
        val sec = String.format("%02d", this % 60)

        return "${min}:${sec}"
    }

    private fun String.toUnderlineSpannable(): SpannableString {
        val spannable = SpannableString(this)
        spannable.setSpan(UnderlineSpan(), 0, this.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        return spannable
    }
}