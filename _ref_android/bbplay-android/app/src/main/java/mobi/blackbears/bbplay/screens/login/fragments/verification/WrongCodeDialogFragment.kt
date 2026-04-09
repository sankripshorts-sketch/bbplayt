package mobi.blackbears.bbplay.screens.login.fragments.verification

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentWrongCodeBinding

class WrongCodeDialogFragment : BindingBottomFragment<BottomFragmentWrongCodeBinding>(
    BottomFragmentWrongCodeBinding::inflate
) {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.btOk.setOnClickListener {
            findNavController().navigateUp()
        }
    }
}