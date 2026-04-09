package mobi.blackbears.bbplay.screens.profile.fragments

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentBonusBinding


class BonusDialogFragment : BindingBottomFragment<BottomFragmentBonusBinding>(
    BottomFragmentBonusBinding::inflate
) {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.btClearBonuses.setOnClickListener {
            findNavController().navigateUp()
        }
    }
}