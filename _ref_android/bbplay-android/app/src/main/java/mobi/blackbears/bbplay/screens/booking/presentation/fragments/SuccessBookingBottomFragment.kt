package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentSuccessBookingBinding

class SuccessBookingBottomFragment :
    BindingBottomFragment<BottomFragmentSuccessBookingBinding>(BottomFragmentSuccessBookingBinding::inflate) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.btnExcellent.setBlockingClickListener {
            findNavController().navigateUp()
        }
    }
}