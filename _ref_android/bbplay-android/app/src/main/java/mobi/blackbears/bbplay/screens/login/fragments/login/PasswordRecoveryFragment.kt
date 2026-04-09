package mobi.blackbears.bbplay.screens.login.fragments.login

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentPasswordRecoveryBinding

class PasswordRecoveryFragment : BindingBottomFragment<BottomFragmentPasswordRecoveryBinding>(
    BottomFragmentPasswordRecoveryBinding::inflate) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.btnRecoveryPasswordOk.setOnClickListener {
            findNavController().navigateUp()
        }
    }
}