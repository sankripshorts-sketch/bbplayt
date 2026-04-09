package mobi.blackbears.bbplay.screens.settings

import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentSettingsBinding
import mobi.blackbears.bbplay.screens.login.di.DaggerLoginComponent
import mobi.blackbears.bbplay.screens.settings.di.DaggerSettingsComponent
import javax.inject.Inject

class SettingsFragment : BindingFragment<FragmentSettingsBinding>(FragmentSettingsBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory

    private val viewModel by viewModels<SettingsViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerSettingsComponent
            .factory()
            .create(
                context.appComponent,
                DaggerLoginComponent.factory().create(context.appComponent)
            ).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        observeSettingsInfo()
        setNavigation()
        setLogoutButton()
        setChangePasswordButton()
        setupMessage()
        setLoader()
    }

    private fun observeSettingsInfo() {
        with(binding.personalInfoBlock) {
            viewModel.userInfo.observe(viewLifecycleOwner) {
                etNicknameSettings.text = it.memberAccount
                etPhoneSettings.text = it.memberPhone
                etFirstName.text = it.memberFirstName
                etSecondName.text = it.memberLastName
                etDateOfBirth.text = it.memberBirthday
                etEmail.apply {
                    text = it.memberEmail
                    isVisible = !it.memberEmail.isNullOrEmpty()
                }
            }
        }
    }

    private fun setNavigation() {
        binding.btBackFromSettings.setOnClickListener {
            findNavController().popBackStack()
        }
    }

    private fun setLogoutButton() {
        binding.btExit.setOnClickListener {
            viewModel.logOut()
        }
    }

    private fun setChangePasswordButton() {
        with(binding) {
            etOldPassword.addTextIsNotEmptyListener(viewModel::setOldPasswordNotEmpty)
            etNewPassword.addTextIsNotEmptyListener(viewModel::setNewPasswordNotEmpty)

            btnSaveChanges.setOnClickListener {
                viewModel.onClickChangePassword(etOldPassword.getText(), etNewPassword.getText())
            }

            viewModel.isButtonEnabled.observe(viewLifecycleOwner) { (oldNotEmpty, newNotEmpty) ->
                btnSaveChanges.isEnabled = oldNotEmpty && newNotEmpty
            }
        }
    }

    private fun setupMessage() {
        viewModel.messageFlow.observe(viewLifecycleOwner) {
            Toast.makeText(activity, it.responseMessage, Toast.LENGTH_SHORT).show()
        }

        viewModel.successFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireActivity(), getString(it), Toast.LENGTH_SHORT).show()
        }
    }

    private fun setLoader() {
        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.progressBar.root.isVisible = it
        }
    }
}