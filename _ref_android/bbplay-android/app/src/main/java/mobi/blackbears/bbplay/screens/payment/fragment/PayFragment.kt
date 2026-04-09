package mobi.blackbears.bbplay.screens.payment.fragment

import android.content.Context
import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.*
import androidx.navigation.fragment.*
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentPayBinding
import mobi.blackbears.bbplay.screens.payment.di.DaggerPaymentComponent
import ru.yoomoney.sdk.kassa.payments.Checkout
import javax.inject.Inject


class PayFragment : BindingFragment<FragmentPayBinding>(FragmentPayBinding::inflate) {
    private val args by navArgs<PayFragmentArgs>()

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<PayViewModel> { factory }

    private val paymentTokenLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            viewModel.checkTokenResult(result)
        }

    private val paymentConfirmationLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            viewModel.checkConfirmPaymentResult(result)
        }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerPaymentComponent.factory().create(context.appComponent).inject(this)
        viewModel.setUserData(args.userPhone, args.userEmail)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setNavigation()
        setFastButtonsChoiceMoney()
        setButtonEnabled()
        setButtonPayClick()
        checkFragmentResultListener()
    }

    private fun setNavigation() {
        binding.btBack.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setFastButtonsChoiceMoney() {
        with(binding) {
            tvTwoHundred.setOnClickListener {
                viewModel.choiceFastMoneyValue(tvTwoHundred.text.toString())
            }
            tvThreeHundred.setOnClickListener {
                viewModel.choiceFastMoneyValue(tvThreeHundred.text.toString())
            }
            tvFourHundred.setOnClickListener {
                viewModel.choiceFastMoneyValue(tvFourHundred.text.toString())
            }

            viewModel.moneyFlow.observe(viewLifecycleOwner, observer = etSummaFragment::setText)
        }
    }

    private fun setButtonEnabled() {
        with(binding) {
            etSummaFragment.addTextChangedListener(afterTextChanged = viewModel::checkMinSum)
            viewModel.isButtonEnabled.observe(viewLifecycleOwner, observer = btOkPay::setEnabled)
        }
    }

    private fun setButtonPayClick() {
        with(binding) {
            btOkPay.setBlockingClickListener {
                viewModel.onClickPay(etSummaFragment.text.toString())
            }
        }

        viewModel.paymentParams.observe(viewLifecycleOwner) {
            val intent = Checkout.createTokenizeIntent(requireContext(), it)
            paymentTokenLauncher.launch(intent)
        }

        viewModel.confirmationUrl.observe(viewLifecycleOwner) { (confirmUrl, type) ->
            val intent = Checkout.createConfirmationIntent(
                requireContext(),
                confirmationUrl = confirmUrl,
                paymentMethodType = type,
                clientApplicationKey = BuildConfig.CLIENT_ID,
                shopId = BuildConfig.SHOP_ID,
            )
            paymentConfirmationLauncher.launch(intent)
        }

        viewModel.navCommand.observe(viewLifecycleOwner, observer = findNavController()::safeNavigate)
    }

    private fun checkFragmentResultListener() {
        setFragmentResultListener(ProcessPaymentBottomFragment.PENDING_OR_SUCCESS) { _, _ ->
            viewModel.saveEmail()
            viewModel.navigateToProfile()
        }
    }
}