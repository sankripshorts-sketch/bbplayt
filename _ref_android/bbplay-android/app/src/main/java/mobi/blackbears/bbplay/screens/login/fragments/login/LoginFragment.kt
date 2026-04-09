package mobi.blackbears.bbplay.screens.login.fragments.login

import android.content.Context
import android.os.Bundle
import android.view.View
import android.view.animation.AnimationUtils
import android.widget.Toast
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.hideOrShowBottomNavigation
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentLoginBinding
import mobi.blackbears.bbplay.screens.login.di.DaggerLoginComponent
import net.yslibrary.android.keyboardvisibilityevent.KeyboardVisibilityEvent
import javax.inject.Inject

class LoginFragment : BindingFragment<FragmentLoginBinding>(FragmentLoginBinding::inflate) {
    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<LoginViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerLoginComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setLoginButton()
        setError()
        setNavigation()
        setAnimationLogoByKeyboardChange()
    }

    private fun setLoginButton() {
        with(binding) {
            etNicknameLogin.addTextIsNotEmptyListener(viewModel::setPhoneIsNotEmpty)
            etPasswordLogin.addTextIsNotEmptyListener(viewModel::setPasswordIsNotEmpty)

            btnLogIn.setBlockingClickListener {
                viewModel.tryLogInUser(etNicknameLogin.getText(), etPasswordLogin.getText())
            }

            viewModel.isButtonEnabled.observe(viewLifecycleOwner) { (phoneNotEmpty, passwordNotEmpty) ->
                btnLogIn.isEnabled = phoneNotEmpty && passwordNotEmpty
            }
        }
    }

    private fun setError() {
        viewModel.errorFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }

    private fun setNavigation() {
        with(binding) {
            tvCreateAccountLogin.setOnClickListener {
                viewModel.navigateToRegistrationFragment()
            }
            tvForgotPasswordLogin.setOnClickListener {
                viewModel.navigateToPasswordRecoveryBottomFragment()
            }
        }

        viewModel.navCommand.observe(viewLifecycleOwner, observer = findNavController()::safeNavigate)
    }

    private fun setAnimationLogoByKeyboardChange() {
        KeyboardVisibilityEvent.setEventListener(
            requireActivity(),
            viewLifecycleOwner
        ) { isKeyBoardShow ->
            requireActivity().hideOrShowBottomNavigation(!isKeyBoardShow)
            viewModel.startAnimationLogo(isKeyBoardShow)
        }

        viewModel.logoAnimationScale.observe(viewLifecycleOwner) {
            val anim = AnimationUtils.loadAnimation(context, it)
            binding.ivLoginLogo.startAnimation(anim)
        }
    }
}