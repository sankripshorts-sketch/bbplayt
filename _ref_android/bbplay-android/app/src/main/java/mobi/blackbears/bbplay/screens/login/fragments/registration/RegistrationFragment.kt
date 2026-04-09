package mobi.blackbears.bbplay.screens.login.fragments.registration

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.hideOrShowBottomNavigation
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentRegistrationBinding
import mobi.blackbears.bbplay.screens.login.di.DaggerLoginComponent
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import javax.inject.Inject

class RegistrationFragment :
    BindingFragment<FragmentRegistrationBinding>(FragmentRegistrationBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory
    private val domainViewModel by viewModels<RegistrationViewModel> { factory }
    private val uiViewModel by viewModels<UIRegistrationViewModel> { factory }

    private var shouldShowBottomNavigationAfterDestroy = true

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerLoginComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requireActivity().hideOrShowBottomNavigation(false)
        setFocusPhoneChangeWhenCorrectNumber()
        setNavigation()
        setRegistrationButton()
        setErrorFlow()
        setTermsOfUseLink()
    }

    private fun setFocusPhoneChangeWhenCorrectNumber() {
        with(binding.createAccountFields) {
            etNewPhone.addPhoneCorrectFocusChangeListener {
                etEmail.setFocus()
            }
        }
    }

    private fun setNavigation() {
        with(binding) {
            btBackNavigate.setOnClickListener { findNavController().navigateUp() }
            tvDoYouHaveAcc.setOnClickListener { findNavController().navigateUp() }
        }

        domainViewModel.navCommand.observe(viewLifecycleOwner) {
            shouldShowBottomNavigationAfterDestroy = false
            findNavController().safeNavigate(it)
        }
    }

    private fun setRegistrationButton() {
        with(binding.createAccountFields) {
            etNewNickname.addTextIsNotEmptyListener(uiViewModel::setNickNameIsNotEmpty)
            etNewPhone.addTextIsNotEmptyListener(uiViewModel::setPhoneIsNotEmpty)
            etNewFirstName.addTextIsNotEmptyListener(uiViewModel::setFirstNameIsNotEmpty)
            etNewSecondName.addTextIsNotEmptyListener(uiViewModel::setSecondNameIsNotEmpty)
            etNewDateOfBirth.addTextIsNotEmptyListener(uiViewModel::setDateBirthIsNotEmpty)
            etNewPassword.addTextIsNotEmptyListener(uiViewModel::setPasswordIsNotEmpty)
            etEmail.addTextIsNotEmptyListener(uiViewModel::setEmailIsNotEmpty)
            cbAgreeWithTermsOfUse.setOnCheckedChangeListener { _, isChecked ->
                uiViewModel.setAgreeWithTermsOfUseIsChecked(isChecked)
            }

            binding.btCreateAcc.setOnClickListener {
                val fields = NewAccountFields(
                    memberAccount = etNewNickname.getText(),
                    memberPhone = etNewPhone.getText(),
                    memberFirstName = etNewFirstName.getText(),
                    memberEmail = etEmail.getText(),
                    memberSecondName = etNewSecondName.getText(),
                    memberBirthday = etNewDateOfBirth.getText(),
                    memberPassword = etNewPassword.getText()
                )

                domainViewModel.createAccount(fields)
            }

            uiViewModel.isButtonEnabled.observe(viewLifecycleOwner) {
                binding.btCreateAcc.isEnabled =
                    it.isPhoneFilled &&
                            it.isNicknameFilled &&
                            it.isPasswordFilled &&
                            it.isDateOfBirthFilled &&
                            it.isFirstNameFilled &&
                            it.isSecondNameFilled &&
                            it.isEmailFilled &&
                            it.isAgreeWithTermsOfUseChecked
            }
        }
    }

    private fun setErrorFlow() {
        domainViewModel.errorFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }

    private fun openUrlInBrowser(url: String) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        try {
            startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, getString(R.string.no_browser_warning), Toast.LENGTH_SHORT)
                .show()
        }
    }

    private fun setTermsOfUseLink() {
        val termsOfUseLink = getString(R.string.terms_of_use_link)
        binding.createAccountFields.tvAgreeWithTermsOfUse.setOnClickListener {
            openUrlInBrowser(termsOfUseLink)
        }
    }

    override fun onDestroyView() {
        /*
        todo: вынести логику по централизованному показу/скрытию bottom navigation в addOnDestinationListener:
              изначальная реализация с управлением непосредственно в методах жизненного цикла
              фрагментов вызывает побочные эффекты при углублении больше чем на один destination
              от startDestination, требуя дополнительных манипуляций
        */
        requireActivity().hideOrShowBottomNavigation(shouldShowBottomNavigationAfterDestroy)
        shouldShowBottomNavigationAfterDestroy = true
        super.onDestroyView()
    }
}