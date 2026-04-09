package mobi.blackbears.bbplay.screens.payment.fragment

import android.os.Bundle
import android.view.View
import androidx.core.os.bundleOf
import androidx.core.view.forEach
import androidx.core.view.isVisible
import androidx.fragment.app.setFragmentResult
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentProcessPaymentBinding
import mobi.blackbears.bbplay.screens.payment.domain.model.PaymentStatus

class ProcessPaymentBottomFragment : BindingBottomFragment<BottomFragmentProcessPaymentBinding>(
    BottomFragmentProcessPaymentBinding::inflate
) {
    private val viewModel: PayViewModel by viewModels({ parentFragmentManager.fragments[0] })

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        dialog?.setCancelable(false)
        setViewByPayStatus()
        setClickOkButton()
    }

    private fun setViewByPayStatus() {
        viewModel.paymentStatus.observe(viewLifecycleOwner, Lifecycle.State.CREATED) {
            binding.btnOkayPayment.isEnabled = it.isButtonEnabled
            setVisibleView(it)
        }
    }

    private fun setVisibleView(paymentStatus: PaymentStatus) {
        with(binding) {
            when (paymentStatus) {
                PaymentStatus.LOADING -> {
                    layoutProcessInfo.forEach { view -> view.isVisible = false }
                    loadingPaymentStatus.root.isVisible = true
                }
                PaymentStatus.PENDING -> {
                    loadingPaymentStatus.root.isVisible = false
                    paymentProcess.root.isVisible = true
                }
                PaymentStatus.CANCELED -> {
                    loadingPaymentStatus.root.isVisible = false
                    paymentFail.root.isVisible = true
                }
                PaymentStatus.SUCCEEDED -> {
                    loadingPaymentStatus.root.isVisible = false
                    paymentSuccess.root.isVisible = true
                }
            }
        }
    }

    private fun setClickOkButton() {
        binding.btnOkayPayment.setOnClickListener {
            viewModel.onOkayButtonClickPaymentBottomFragment()
        }

        viewModel.isSuccessOrPendingStatus.observe(viewLifecycleOwner) { isSuccess ->
            if (isSuccess) setFragmentResult(PENDING_OR_SUCCESS, bundleOf())
            findNavController().navigateUp()
        }
    }

    companion object {
        const val PENDING_OR_SUCCESS = "pending or success payment status"
    }
}