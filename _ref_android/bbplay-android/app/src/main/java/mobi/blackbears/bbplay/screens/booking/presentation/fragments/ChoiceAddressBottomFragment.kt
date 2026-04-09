package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentChoiceClubBinding


class ChoiceAddressBottomFragment :
    BindingBottomFragment<BottomFragmentChoiceClubBinding>(BottomFragmentChoiceClubBinding::inflate) {

    private val viewModel: BookingViewModel by viewModels({ parentFragmentManager.fragments[0] })

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel.clubsInfo.observe(viewLifecycleOwner) {
            binding.rbFirstClub.text = it.address
        }

        binding.btSelectLocation.setOnClickListener {
            findNavController().navigateUp()
        }
    }
}